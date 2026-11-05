import random
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from typing import Optional, Tuple

from database import settings_col, users_col, sms_logs_col, otp_verifications_col, stock_inwards_col
from config import TEXTBEE_API_KEY, TEXTBEE_DEVICE_ID, TEXTBEE_API_URL, TEXTBEE_DEMO_MODE

def get_admin_phone_and_name(settings: Optional[dict] = None) -> Tuple[str, str]:
    """Retrieve the primary store owner/admin phone number and name."""
    if not settings:
        settings = settings_col.find_one({}) or {}
    
    phone = (settings.get("phone") or "").strip()
    owner_name = settings.get("business_name", "Store Owner")

    if not phone:
        admin_user = users_col.find_one({"role": "admin"})
        if admin_user:
            phone = (admin_user.get("phone") or "").strip()
            owner_name = admin_user.get("full_name") or admin_user.get("username", "Admin")

    return phone, owner_name

def dispatch_textbee_sms(
    recipient_phone: str,
    message: str,
    log_type: str = "STOCK_ALERT",
    sent_by: str = "system",
    settings: Optional[dict] = None
) -> dict:
    """
    Core TextBee SMS dispatcher: sends real SMS if configured, otherwise records clean simulation.
    Never throws unhandled exceptions that could block business operations.
    """
    if not settings:
        settings = settings_col.find_one({}) or {}

    api_key = (settings.get("textbee_api_key") or TEXTBEE_API_KEY or "").strip()
    device_id = (settings.get("textbee_device_id") or TEXTBEE_DEVICE_ID or "").strip()
    demo_mode = False if (api_key and device_id and not TEXTBEE_DEMO_MODE) else settings.get("textbee_demo_mode", TEXTBEE_DEMO_MODE)
    api_url = (settings.get("textbee_api_url") or TEXTBEE_API_URL or "https://api.textbee.dev/api/v1").rstrip('/')

    log_entry = {
        "invoice_number": log_type,
        "recipient_phone": recipient_phone,
        "customer_name": f"Notification: {log_type}",
        "message_text": message,
        "status": "DISPATCHING",
        "sent_by": sent_by,
        "created_at": datetime.now(timezone.utc)
    }

    # Demo Simulation
    if demo_mode or not (api_key and device_id):
        log_entry["status"] = "DEMO_SIMULATION"
        log_entry["provider_response"] = {
            "demo": True,
            "note": "TextBee in demo mode or credentials not set."
        }
        sms_logs_col.insert_one(log_entry)
        return {"success": True, "mode": "demo", "status": "DEMO_SIMULATION", "message": message}

    # Real TextBee API Dispatch
    try:
        url = f"{api_url}/gateway/devices/{device_id}/sendSMS"
        headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "recipients": [recipient_phone],
            "message": message
        }
        resp = requests.post(url, json=payload, headers=headers, verify=False, timeout=12)
        resp_data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {"raw": resp.text}
        
        status_label = "DISPATCHED_TO_GATEWAY" if resp.status_code in (200, 201) else "FAILED"
        log_entry["status"] = status_label
        log_entry["http_status_code"] = resp.status_code
        log_entry["provider_response"] = resp_data
        sms_logs_col.insert_one(log_entry)

        return {
            "success": resp.status_code in (200, 201),
            "mode": "live",
            "status": status_label,
            "provider_response": resp_data
        }
    except Exception as e:
        log_entry["status"] = "FAILED"
        log_entry["provider_response"] = {"error": str(e)}
        sms_logs_col.insert_one(log_entry)
        return {"success": False, "mode": "live", "error": str(e)}

def notify_stock_inward(
    staff_name: str,
    product_name: str,
    quantity: float,
    supplier_name: str,
    supplier_bill_no: str,
    auth_type: str,
    declaration: Optional[str] = None,
    discrepancy_info: Optional[dict] = None,
    free_items: Optional[list] = None
) -> dict:
    """Instant alert triggered within 0-5s when staff logs stock inward, including discrepancy statements and promotional gifts."""
    phone, owner_name = get_admin_phone_and_name()
    if not phone:
        return {"success": False, "message": "No admin phone configured"}

    qty_str = f"{int(quantity)}" if float(quantity).is_integer() else f"{quantity}"
    gift_suffix = ""
    if free_items and len(free_items) > 0:
        gift_names = ", ".join([f"{fi.get('quantity')}x {fi.get('item_name')}" for fi in free_items])
        gift_suffix = f" PROMO GIFTS: {gift_names}."
    
    if discrepancy_info and discrepancy_info.get("shortage", 0) > 0:
        notes_snippet = f" Reason: \"{discrepancy_info['notes'][:60]}\"" if discrepancy_info.get("notes") else ""
        msg = (
            f"Hisaab-Kitaab Alert: {staff_name} logged Inward of {qty_str} units of '{product_name}' "
            f"(Bill #{supplier_bill_no}). SHORTAGE FLAGGED: Supplier billed {discrepancy_info['billed_qty']}, "
            f"received {qty_str} (-{discrepancy_info['shortage']} short).{notes_snippet}{gift_suffix} Please audit in Stock Tray."
        )
    elif auth_type == "EMERGENCY_OVERRIDE":
        decl_snippet = f" Note: \"{declaration[:60]}\"" if declaration else ""
        msg = (
            f"Hisaab-Kitaab Alert: {staff_name} logged Emergency Restock of {qty_str} units of "
            f"'{product_name}'. Vendor: {supplier_name}, Bill: #{supplier_bill_no}.{decl_snippet}{gift_suffix}"
        )
    elif auth_type == "SMS_OTP":
        msg = (
            f"Hisaab-Kitaab: {staff_name} logged Authorized Restock of {qty_str} units of "
            f"'{product_name}' via OTP. Vendor: {supplier_name}, Bill: #{supplier_bill_no}.{gift_suffix}"
        )
    else:
        msg = (
            f"Hisaab-Kitaab: {staff_name} logged Stock Inward of {qty_str} units of "
            f"'{product_name}'. Vendor: {supplier_name}, Bill: #{supplier_bill_no}.{gift_suffix}"
        )

    return dispatch_textbee_sms(
        recipient_phone=phone,
        message=msg,
        log_type=f"INWARD-{auth_type}",
        sent_by=staff_name
    )

def notify_stockist_statement(
    staff_name: str,
    product_name: str,
    supplier_bill_no: str,
    statement: str,
    is_appeal: bool = False
) -> dict:
    """Instant SMS to owner when stockist submits an explanation statement or formal appeal for a shortage/discrepancy."""
    phone, _ = get_admin_phone_and_name()
    if not phone:
        return {"success": False, "message": "No admin phone configured"}

    action_label = "formal APPEAL" if is_appeal else "discrepancy statement"
    msg = (
        f"Hisaab-Kitaab Alert: Stockist {staff_name} submitted {action_label} for Bill #{supplier_bill_no} "
        f"('{product_name}'): \"{statement[:75]}\". Open Stock Audit Tray to review & resolve."
    )
    return dispatch_textbee_sms(
        recipient_phone=phone,
        message=msg,
        log_type="STOCKIST_DISPUTE_APPEAL" if is_appeal else "STOCKIST_STATEMENT",
        sent_by=staff_name
    )

def notify_low_stock(
    product_name: str,
    remaining_qty: float,
    threshold: float,
    unit: str = "Pcs"
) -> dict:
    """Triggered when an invoice sale drops an item below its low-stock alert threshold."""
    phone, _ = get_admin_phone_and_name()
    if not phone:
        return {"success": False, "message": "No admin phone configured"}

    rem_str = f"{int(remaining_qty)}" if float(remaining_qty).is_integer() else f"{remaining_qty}"
    thresh_str = f"{int(threshold)}" if float(threshold).is_integer() else f"{threshold}"

    msg = (
        f"Hisaab-Kitaab Alert: Low stock on '{product_name}'. "
        f"Remaining balance: {rem_str} {unit} (Threshold: {thresh_str}). Restock required."
    )

    return dispatch_textbee_sms(
        recipient_phone=phone,
        message=msg,
        log_type="LOW_STOCK_ALERT",
        sent_by="system"
    )

def send_restock_authorization_otp(
    staff_user: dict,
    product_name: str,
    quantity: float,
    supplier_bill_no: str
) -> dict:
    """Generates 6-digit OTP for restock authorization and dispatches via TextBee to Admin."""
    phone, owner_name = get_admin_phone_and_name()
    if not phone:
        return {"success": False, "message": "No admin phone configured"}

    otp_code = f"{random.randint(100000, 999999)}"
    staff_id = str(staff_user.get("id") or staff_user.get("_id") or staff_user.get("username"))
    staff_name = staff_user.get("full_name") or staff_user.get("username", "Stockist")

    # Clear old restock OTPs for this staff
    otp_verifications_col.delete_many({
        "staff_id": staff_id,
        "purpose": "stock_restock"
    })

    # Save new OTP record (auto-expires in 15 mins via TTL)
    otp_verifications_col.insert_one({
        "staff_id": staff_id,
        "staff_name": staff_name,
        "purpose": "stock_restock",
        "otp": otp_code,
        "product_name": product_name,
        "quantity": quantity,
        "supplier_bill_no": supplier_bill_no,
        "created_at": datetime.now(timezone.utc)
    })

    qty_str = f"{int(quantity)}" if float(quantity).is_integer() else f"{quantity}"
    msg = (
        f"Hisaab-Kitaab: {staff_name} requested authorization to restock {qty_str} units of "
        f"'{product_name}' (Bill #{supplier_bill_no}). OTP: {otp_code}. Valid 15 mins."
    )

    dispatch_res = dispatch_textbee_sms(
        recipient_phone=phone,
        message=msg,
        log_type="RESTOCK-OTP",
        sent_by=staff_name
    )

    phone_hint = phone[-4:] if len(phone) >= 4 else phone
    return {
        "success": True,
        "message": f"Authorization OTP sent to Store Owner phone ending in •••• {phone_hint}.",
        "phone_hint": phone_hint,
        "demo_otp": otp_code if dispatch_res.get("mode") == "demo" else None
    }

def verify_restock_otp(staff_id: str, otp_code: str) -> bool:
    """Validate 6-digit restock authorization OTP."""
    rec = otp_verifications_col.find_one({
        "staff_id": str(staff_id),
        "purpose": "stock_restock",
        "otp": otp_code.strip()
    })
    if rec:
        # Delete so it cannot be reused
        otp_verifications_col.delete_one({"_id": rec["_id"]})
        return True
    return False

def trigger_unverified_cron_reminder() -> dict:
    """
    Cloud Cron Job task (runs every 12 hours / 9 PM EOD):
    Finds unverified stock inward batches older than 12 hours and sends a consolidated summary SMS.
    """
    twelve_hours_ago = datetime.now(timezone.utc) - timedelta(hours=12)
    query = {
        "status": "PENDING_AUDIT",
        "cron_reminder_sent": {"$ne": True},
        "created_at": {"$lt": twelve_hours_ago}
    }

    pending_inwards = list(stock_inwards_col.find(query))
    if not pending_inwards:
        return {"success": True, "count": 0, "message": "No unverified inward batches older than 12 hours."}

    phone, _ = get_admin_phone_and_name()
    if not phone:
        return {"success": False, "count": len(pending_inwards), "message": "No admin phone configured."}

    count = len(pending_inwards)
    msg = (
        f"Hisaab-Kitaab Daily Audit: You have {count} stock inward batches pending physical bill "
        f"verification from today. Please review in Admin Stock Audit Tray."
    )

    res = dispatch_textbee_sms(
        recipient_phone=phone,
        message=msg,
        log_type="CRON_AUDIT_DIGEST",
        sent_by="cloud_cron"
    )

    # Mark as sent
    ids = [d["_id"] for d in pending_inwards]
    stock_inwards_col.update_many({"_id": {"$in": ids}}, {"$set": {"cron_reminder_sent": True}})

    return {"success": True, "count": count, "sms_dispatch": res}

