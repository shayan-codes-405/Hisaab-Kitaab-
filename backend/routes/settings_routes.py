from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from database import settings_col, users_col, serialize_doc, get_business_for_user
from auth import require_admin, require_staff_or_admin
from config import (
    TEXTBEE_API_KEY as ENV_TEXTBEE_KEY,
    TEXTBEE_DEVICE_ID as ENV_TEXTBEE_DEV,
    TEXTBEE_API_URL as ENV_TEXTBEE_URL,
    TEXTBEE_DEMO_MODE as ENV_TEXTBEE_DEMO
)

router = APIRouter(prefix="/api/settings", tags=["Business & GST Settings"])

class BusinessCreateRequest(BaseModel):
    business_name: str
    business_category: str = "general"
    phone: str
    state: str
    gstin: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""

class BusinessSettingsUpdate(BaseModel):
    business_name: str
    business_category: Optional[str] = "general"
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

@router.get("/businesses")
def list_enterprise_businesses(user: dict = Depends(require_staff_or_admin)):
    """List all businesses / branches belonging to this enterprise."""
    current_biz = get_business_for_user(user)
    ent_id = current_biz.get("enterprise_id") or str(current_biz.get("_id", ""))
    
    # Query businesses by enterprise_id, or fallback to all if single tenant
    query = {"$or": [{"enterprise_id": ent_id}, {"_id": current_biz.get("_id")}]} if ent_id else {}
    businesses = list(settings_col.find(query).sort("business_name", 1))
    
    active_b_id = str(user.get("business_id", ""))
    results = []
    for b in businesses:
        b_dict = serialize_doc(b)
        b_dict["is_active"] = (b_dict.get("id") == active_b_id)
        results.append(b_dict)
    return results

@router.post("/businesses")
def create_enterprise_business(payload: BusinessCreateRequest, admin_user: dict = Depends(require_admin)):
    """Admin-only: Add a new business, outlet or branch under this enterprise."""
    current_biz = get_business_for_user(admin_user)
    ent_id = current_biz.get("enterprise_id") or str(current_biz.get("_id", ""))
    
    clean_bname = payload.business_name.strip()
    clean_cat = (payload.business_category or "general").strip().lower()
    
    new_doc = {
        "enterprise_id": ent_id,
        "business_name": clean_bname,
        "business_category": clean_cat,
        "gstin": payload.gstin.strip().upper() if payload.gstin else (current_biz.get("gstin") or ""),
        "phone": payload.phone.strip(),
        "email": payload.email.strip() if payload.email else (current_biz.get("email") or ""),
        "state": payload.state.strip(),
        "address": payload.address.strip(),
        "invoice_prefix": "INV",
        "next_invoice_number": 1,
        "bank_name": current_biz.get("bank_name", ""),
        "bank_account_no": current_biz.get("bank_account_no", ""),
        "bank_ifsc": current_biz.get("bank_ifsc", ""),
        "upi_id": current_biz.get("upi_id", ""),
        "terms_conditions": current_biz.get("terms_conditions", "1. Goods once sold will not be returned.\n2. Payment due within 15 days of invoice date."),
        "textbee_api_url": current_biz.get("textbee_api_url", ENV_TEXTBEE_URL),
        "textbee_api_key": current_biz.get("textbee_api_key", ENV_TEXTBEE_KEY),
        "textbee_device_id": current_biz.get("textbee_device_id", ENV_TEXTBEE_DEV),
        "textbee_demo_mode": current_biz.get("textbee_demo_mode", ENV_TEXTBEE_DEMO),
        "is_primary": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    res = settings_col.insert_one(new_doc)
    new_doc["_id"] = res.inserted_id
    
    return {
        "message": f"New business '{clean_bname}' ({clean_cat}) added successfully!",
        "business": serialize_doc(new_doc)
    }

@router.post("/switch-business/{business_id}")
def switch_active_business(business_id: str, user: dict = Depends(require_admin)):
    """Admin-only: Switch active store context to another business within this enterprise."""
    try:
        target_oid = ObjectId(business_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid business ID format.")
        
    target_biz = settings_col.find_one({"_id": target_oid})
    if not target_biz:
        raise HTTPException(status_code=404, detail="Target business not found.")
        
    uid_str = str(user.get("id") or user.get("_id"))
    users_col.update_one(
        {"_id": ObjectId(uid_str)},
        {"$set": {
            "business_id": str(target_oid),
            "business_name": target_biz.get("business_name", "")
        }}
    )
    
    updated_user = users_col.find_one({"_id": ObjectId(uid_str)}, {"password_hash": 0})
    return {
        "message": f"Switched active store to {target_biz.get('business_name')}",
        "user": serialize_doc(updated_user),
        "business": serialize_doc(target_biz)
    }

@router.get("")
def get_business_settings(user: dict = Depends(require_staff_or_admin)):
    """Fetch business details and GST configurations for the authenticated user's business."""
    doc = get_business_for_user(user)
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
    b_id = admin_user.get("business_id")
    target_id = None
    if b_id:
        try:
            target_id = ObjectId(b_id)
        except Exception:
            pass

    if target_id:
        existing = settings_col.find_one({"_id": target_id})
    else:
        existing = get_business_for_user(admin_user)
        target_id = existing.get("_id") if existing else None

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
        "business_category": (payload.business_category or "general").strip().lower(),
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

    if target_id:
        settings_col.update_one({"_id": target_id}, {"$set": update_data})
        # Keep business_name synchronized in user records
        users_col.update_many({"business_id": str(target_id)}, {"$set": {"business_name": payload.business_name.strip()}})
    else:
        res = settings_col.insert_one(update_data)
        target_id = res.inserted_id
        admin_uid = admin_user.get("id") or admin_user.get("_id")
        if admin_uid:
            users_col.update_one({"_id": ObjectId(admin_uid)}, {"$set": {"business_id": str(target_id), "business_name": payload.business_name.strip()}})

    updated_doc = settings_col.find_one({"_id": target_id})
    return {
        "message": "Business profile updated successfully.",
        "settings": serialize_doc(updated_doc)
    }
