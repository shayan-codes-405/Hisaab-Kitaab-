import re
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, List

from database import invoices_col, settings_col, sms_logs_col, serialize_doc
from auth import require_staff_or_admin
from config import TEXTBEE_API_KEY, TEXTBEE_DEVICE_ID, TEXTBEE_API_URL, TEXTBEE_DEMO_MODE

router = APIRouter(prefix="/api/sms", tags=["TextBee Android SMS Gateway"])

class SendInvoiceSMSRequest(BaseModel):
    invoice_id: str
    phone_number: str = Field(..., min_length=10)
    custom_message: Optional[str] = None

class TestSMSRequest(BaseModel):
    phone_number: str = Field(..., min_length=10)
    message: str = Field(..., min_length=3)

def sanitize_phone_number(phone: str) -> str:
    """Format and validate phone number into E.164 or 10-digit Indian standard."""
    cleaned = re.sub(r'[^0-9+]', '', phone.strip())
    # Add +91 prefix if 10-digit Indian mobile
    if re.match(r'^[6-9]\d{9}$', cleaned):
        cleaned = f"+91{cleaned}"
    elif re.match(r'^0[6-9]\d{9}$', cleaned):
        cleaned = f"+91{cleaned[1:]}"
    elif re.match(r'^91[6-9]\d{9}$', cleaned):
        cleaned = f"+{cleaned}"
        
    if not re.match(r'^\+[1-9]\d{7,14}$', cleaned):
        raise ValueError(f"Invalid phone number format: '{phone}'. Expected valid 10-digit mobile number.")
        
    return cleaned

def format_invoice_sms_breakdown(inv: dict, business_name: str) -> str:
    """Format a detailed Indian GST invoice breakdown SMS."""
    inv_num = inv.get("invoice_number", "")
    customer_name = inv.get("customer", {}).get("name", "Customer")
    final_amt = float(inv.get("final_payable_amount", 0.0))
    subtotal_gross = float(inv.get("subtotal_gross", 0.0))
    total_line_disc = float(inv.get("total_line_discounts", 0.0))
    inv_disc = float(inv.get("invoice_discount_amount", 0.0))
    total_discount = round(total_line_disc + inv_disc, 2)
    taxable_val = float(inv.get("total_net_taxable", 0.0))
    total_tax = float(inv.get("total_tax", 0.0))
    status_str = inv.get("payment_status", "Paid")
    is_interstate = inv.get("is_interstate", False)
    igst = float(inv.get("total_igst", 0.0))

    lines = [
        f"Tax Invoice: {inv_num}",
        f"From: {business_name}",
        f"Customer: {customer_name}",
        "",
        "Items:"
    ]

    items = inv.get("items", [])
    for it in items:
        name = it.get("name", "Item")
        qty = float(it.get("quantity", 1))
        qty_str = f"{int(qty)}" if qty.is_integer() else f"{qty}"
        unit = it.get("unit", "Pcs")
        price = float(it.get("unit_price", 0.0))
        ltot = float(it.get("line_total", 0.0))
        lines.append(f"- {name} ({qty_str} {unit} @ Rs.{price:.2f}) = Rs.{ltot:.2f}")

    lines.append("")
    lines.append(f"Subtotal (Excl Tax): Rs.{subtotal_gross:.2f}")
    if total_discount > 0:
        lines.append(f"Discount: -Rs.{total_discount:.2f}")
    lines.append(f"Taxable Value: Rs.{taxable_val:.2f}")

    if is_interstate:
        lines.append(f"IGST Tax: Rs.{igst:.2f}")
    else:
        lines.append(f"GST Tax (CGST+SGST): Rs.{total_tax:.2f}")

    lines.append(f"Total Amount Payable: Rs.{final_amt:.2f}")
    lines.append(f"Status: {status_str}")
    lines.append("Thank you for your business!")

    return "\n".join(lines)

@router.get("/status")
def get_sms_gateway_status(user: dict = Depends(require_staff_or_admin)):
    """Check active TextBee configuration and readiness."""
    settings = settings_col.find_one({}) or {}
    api_key = (settings.get("textbee_api_key") or TEXTBEE_API_KEY or "").strip()
    device_id = (settings.get("textbee_device_id") or TEXTBEE_DEVICE_ID or "").strip()
    demo_mode = False if (api_key and device_id and not TEXTBEE_DEMO_MODE) else settings.get("textbee_demo_mode", TEXTBEE_DEMO_MODE)
    
    is_configured = bool(api_key and device_id)
    
    return {
        "is_configured": is_configured,
        "demo_mode": demo_mode,
        "device_id_set": bool(device_id),
        "api_key_set": bool(api_key),
        "device_id": device_id if device_id else None,
        "api_url": settings.get("textbee_api_url") or TEXTBEE_API_URL
    }

@router.post("/send")
def send_invoice_sms(data: SendInvoiceSMSRequest, user: dict = Depends(require_staff_or_admin)):
    """
    Explicitly trigger TextBee SMS notification for a customer invoice.
    Sends real SMS if configured, otherwise executes controlled demo simulation.
    """
    try:
        phone = sanitize_phone_number(data.phone_number)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    # Fetch Invoice
    try:
        inv = invoices_col.find_one({"_id": ObjectId(data.invoice_id)})
    except Exception:
        inv = invoices_col.find_one({"invoice_number": data.invoice_id})
        
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice record not found.")

    settings = settings_col.find_one({}) or {}
    api_key = (settings.get("textbee_api_key") or TEXTBEE_API_KEY or "").strip()
    device_id = (settings.get("textbee_device_id") or TEXTBEE_DEVICE_ID or "").strip()
    demo_mode = False if (api_key and device_id and not TEXTBEE_DEMO_MODE) else settings.get("textbee_demo_mode", TEXTBEE_DEMO_MODE)
    api_url = (settings.get("textbee_api_url") or TEXTBEE_API_URL).rstrip('/')

    business_name = settings.get("business_name", "HisabKitab")
    inv_num = inv.get("invoice_number", "")
    final_amt = inv.get("final_payable_amount", 0.0)
    customer_name = inv.get("customer", {}).get("name", "Customer")
    status_str = inv.get("payment_status", "Unpaid")

    # Format detailed message
    if data.custom_message and data.custom_message.strip():
        msg_body = data.custom_message.strip()
    else:
        msg_body = format_invoice_sms_breakdown(inv, business_name)

    # If demo mode or missing credentials, simulate cleanly
    if demo_mode or not (api_key and device_id):
        log_entry = {
            "invoice_number": inv_num,
            "recipient_phone": phone,
            "customer_name": customer_name,
            "message_text": msg_body,
            "status": "DEMO_SIMULATION",
            "provider_response": {
                "demo": True,
                "note": "TextBee is in Demo/Simulated Mode. Credentials not set or Demo explicitly enabled."
            },
            "sent_by": user.get("username", "staff"),
            "created_at": datetime.now(timezone.utc)
        }
        sms_logs_col.insert_one(log_entry)
        
        return {
            "success": True,
            "mode": "demo",
            "message": f"Demo SMS simulated successfully for {phone}.",
            "sms_text": msg_body
        }

    # Real dispatch via TextBee REST API
    url = f"{api_url}/gateway/devices/{device_id}/sendSMS"
    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    payload = {
        "recipients": [phone],
        "message": msg_body
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, verify=False, timeout=15)
        provider_data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {"text": resp.text}
        
        status_label = "DISPATCHED_TO_GATEWAY" if resp.status_code in (200, 201) else "FAILED"
        
        log_entry = {
            "invoice_number": inv_num,
            "recipient_phone": phone,
            "customer_name": customer_name,
            "message_text": msg_body,
            "status": status_label,
            "http_status_code": resp.status_code,
            "provider_response": provider_data,
            "sent_by": user.get("username", "staff"),
            "created_at": datetime.now(timezone.utc)
        }
        sms_logs_col.insert_one(log_entry)

        if resp.status_code in (200, 201):
            return {
                "success": True,
                "mode": "live",
                "message": f"SMS dispatched to Android gateway device successfully for {phone}.",
                "provider_response": provider_data
            }
        else:
            return {
                "success": False,
                "mode": "live",
                "message": f"TextBee Gateway error (HTTP {resp.status_code}): {provider_data.get('message', 'Failed to dispatch')}",
                "provider_response": provider_data
            }

    except requests.RequestException as e:
        log_entry = {
            "invoice_number": inv_num,
            "recipient_phone": phone,
            "customer_name": customer_name,
            "message_text": msg_body,
            "status": "FAILED",
            "provider_response": {"error": str(e)},
            "sent_by": user.get("username", "staff"),
            "created_at": datetime.now(timezone.utc)
        }
        sms_logs_col.insert_one(log_entry)
        raise HTTPException(
            status_code=502,
            detail=f"Network error communicating with TextBee SMS gateway: {str(e)}"
        )

@router.get("/logs")
def get_sms_logs(
    limit: int = 50,
    invoice_number: Optional[str] = None,
    user: dict = Depends(require_staff_or_admin)
):
    """Retrieve history and audit logs of SMS dispatches."""
    query = {}
    if invoice_number:
        query["invoice_number"] = invoice_number
    logs = list(sms_logs_col.find(query).sort("created_at", -1).limit(limit))
    return serialize_doc(logs)
