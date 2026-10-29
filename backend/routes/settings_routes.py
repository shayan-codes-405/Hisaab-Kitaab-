from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from database import settings_col, serialize_doc
from auth import require_admin, require_staff_or_admin
from config import (
    TEXTBEE_API_KEY as ENV_TEXTBEE_KEY,
    TEXTBEE_DEVICE_ID as ENV_TEXTBEE_DEV,
    TEXTBEE_API_URL as ENV_TEXTBEE_URL,
    TEXTBEE_DEMO_MODE as ENV_TEXTBEE_DEMO
)

router = APIRouter(prefix="/api/settings", tags=["Business & GST Settings"])

class BusinessSettingsUpdate(BaseModel):
    business_name: str
    gstin: str
    phone: str
    email: str
    address: str
    state: str
    invoice_prefix: str = "INV"
    bank_name: str = ""
    bank_account_no: str = ""
    bank_ifsc: str = ""
    upi_id: str = ""
    terms_conditions: str = ""
    # TextBee SMS settings
    textbee_api_url: Optional[str] = None
    textbee_api_key: Optional[str] = None
    textbee_device_id: Optional[str] = None
    textbee_demo_mode: Optional[bool] = None

@router.get("")
def get_business_settings(user: dict = Depends(require_staff_or_admin)):
    """Fetch business details and GST configurations."""
    doc = settings_col.find_one({})
    if not doc:
        # Create default from environment if not exists
        default_doc = {
            "business_name": "HisabKitab Enterprises",
            "gstin": "27AAAAA0000A1Z5",
            "phone": "+91 98765 43210",
            "email": "contact@hisabkitab.in",
            "address": "101 Commercial Arcade, M.G. Road",
            "state": "Maharashtra",
            "invoice_prefix": "INV",
            "next_invoice_number": 1,
            "bank_name": "State Bank of India",
            "bank_account_no": "123456789012",
            "bank_ifsc": "SBIN0001234",
            "upi_id": "hisabkitab@upi",
            "terms_conditions": "1. Goods once sold will not be returned.\n2. Interest @ 18% per annum will be charged if bill is not paid within due date.",
            "textbee_api_url": ENV_TEXTBEE_URL,
            "textbee_api_key": ENV_TEXTBEE_KEY,
            "textbee_device_id": ENV_TEXTBEE_DEV,
            "textbee_demo_mode": ENV_TEXTBEE_DEMO,
            "updated_at": datetime.now(timezone.utc)
        }
        res = settings_col.insert_one(default_doc)
        default_doc["_id"] = res.inserted_id
        doc = default_doc
    else:
        # Sync environment overrides if present
        sync_updates = {}
        if ENV_TEXTBEE_KEY and doc.get("textbee_api_key") != ENV_TEXTBEE_KEY:
            sync_updates["textbee_api_key"] = ENV_TEXTBEE_KEY
        if ENV_TEXTBEE_DEV and doc.get("textbee_device_id") != ENV_TEXTBEE_DEV:
            sync_updates["textbee_device_id"] = ENV_TEXTBEE_DEV
        if ENV_TEXTBEE_DEMO is not None and doc.get("textbee_demo_mode") != ENV_TEXTBEE_DEMO:
            sync_updates["textbee_demo_mode"] = ENV_TEXTBEE_DEMO
        if sync_updates:
            settings_col.update_one({"_id": doc["_id"]}, {"$set": sync_updates})
            doc.update(sync_updates)

    data = serialize_doc(doc)
    # Never expose full raw API key to regular staff or in logs
    raw_key = data.get("textbee_api_key", "")
    data["has_textbee_key"] = bool(raw_key)
    if user.get("role") != "admin":
        data["textbee_api_key"] = "••••••••" if raw_key else ""
    else:
        # Mask middle of key for admin viewing
        if raw_key and len(raw_key) > 8:
            data["textbee_api_key_masked"] = raw_key[:4] + "••••••••" + raw_key[-4:]
        else:
            data["textbee_api_key_masked"] = raw_key
            
    return data

@router.put("")
def update_business_settings(payload: BusinessSettingsUpdate, admin_user: dict = Depends(require_admin)):
    """Admin-only: Update business details, GSTIN, bank profile and TextBee SMS credentials."""
    existing = settings_col.find_one({}) or {}
    
    update_data = {
        "business_name": payload.business_name.strip(),
        "gstin": payload.gstin.strip().upper(),
        "phone": payload.phone.strip(),
        "email": payload.email.strip(),
        "address": payload.address.strip(),
        "state": payload.state.strip(),
        "invoice_prefix": payload.invoice_prefix.strip().upper() or "INV",
        "bank_name": payload.bank_name.strip(),
        "bank_account_no": payload.bank_account_no.strip(),
        "bank_ifsc": payload.bank_ifsc.strip().upper(),
        "upi_id": payload.upi_id.strip(),
        "terms_conditions": payload.terms_conditions.strip(),
        "updated_at": datetime.now(timezone.utc)
    }

    # TextBee SMS settings
    if payload.textbee_api_url is not None:
        update_data["textbee_api_url"] = payload.textbee_api_url.strip()
    if payload.textbee_device_id is not None:
        update_data["textbee_device_id"] = payload.textbee_device_id.strip()
    if payload.textbee_demo_mode is not None:
        update_data["textbee_demo_mode"] = payload.textbee_demo_mode
        
    # Only update API key if user passed a new unmasked string
    if payload.textbee_api_key is not None and not payload.textbee_api_key.startswith("•"):
        update_data["textbee_api_key"] = payload.textbee_api_key.strip()

    settings_col.update_one({}, {"$set": update_data}, upsert=True)
    return {"message": "Business settings and invoice configurations updated successfully."}
