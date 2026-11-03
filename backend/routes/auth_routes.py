import random
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, List

from database import users_col, settings_col, sms_logs_col, otp_verifications_col, serialize_doc, get_business_for_user
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin
)
from config import TEXTBEE_API_KEY, TEXTBEE_DEVICE_ID, TEXTBEE_API_URL, TEXTBEE_DEMO_MODE

router = APIRouter(prefix="/api/auth", tags=["Authentication & Registration"])

class SignupRequest(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    business_name: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=7)
    state: str = Field(..., min_length=2)
    gstin: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""

class LoginRequest(BaseModel):
    username: str
    password: str

class SendStaffOtpRequest(BaseModel):
    staff_username: Optional[str] = ""

class CreateStaffRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    role: str = "staff" # "staff" (Billing Cashier) or "inventory_manager" (Storekeeper)
    phone: Optional[str] = ""
    email: Optional[str] = ""
    otp: str = Field(..., min_length=4)

def dispatch_otp_sms(phone: str, otp_code: str, business_name: str, settings: dict, admin_user: dict) -> dict:
    """Send authorization OTP to Admin's registered phone via TextBee or log demo simulation."""
    msg_body = f"HisabKitab Security: Your authorization OTP to add a new staff member to {business_name} is {otp_code}. Valid for 10 minutes. Do not share with unauthorized persons."
    api_key = (settings.get("textbee_api_key") or TEXTBEE_API_KEY or "").strip()
    device_id = (settings.get("textbee_device_id") or TEXTBEE_DEVICE_ID or "").strip()
    demo_mode = False if (api_key and device_id and not TEXTBEE_DEMO_MODE) else settings.get("textbee_demo_mode", TEXTBEE_DEMO_MODE)
    api_url = (settings.get("textbee_api_url") or TEXTBEE_API_URL or "https://api.textbee.dev/api/v1").rstrip('/')

    log_entry = {
        "invoice_number": "STAFF-AUTH-OTP",
        "recipient_phone": phone,
        "customer_name": f"Admin ({admin_user.get('username')})",
        "message_text": msg_body,
        "status": "OTP_SENT",
        "sent_by": admin_user.get("username", "admin"),
        "created_at": datetime.now(timezone.utc)
    }

    if demo_mode or not (api_key and device_id):
        log_entry["status"] = "DEMO_OTP_SIMULATED"
        log_entry["provider_response"] = {"demo": True, "note": "Simulated OTP in demo mode"}
        sms_logs_col.insert_one(log_entry)
        return {"mode": "demo", "dispatched": True, "otp": otp_code}

    # Dispatch real SMS via TextBee REST API
    try:
        url = f"{api_url}/gateway/devices/{device_id}/sendSMS"
        headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json"
        }
        resp = requests.post(url, json={"recipients": [phone], "message": msg_body}, headers=headers, verify=False, timeout=12)
        log_entry["http_status_code"] = resp.status_code
        log_entry["status"] = "DISPATCHED_TO_GATEWAY" if resp.status_code in (200, 201) else "FAILED"
        sms_logs_col.insert_one(log_entry)
        return {"mode": "live", "dispatched": resp.status_code in (200, 201)}
    except Exception as e:
        log_entry["status"] = "FAILED"
        log_entry["provider_response"] = {"error": str(e)}
        sms_logs_col.insert_one(log_entry)
        return {"mode": "live", "dispatched": False, "error": str(e)}

@router.get("/status")
def get_auth_status():
    """Check how many registered accounts exist in MongoDB."""
    user_count = users_col.count_documents({})
    return {
        "user_count": user_count,
        "initialized": user_count > 0
    }

@router.post("/signup")
def register_business(data: SignupRequest):
    """
    Public Endpoint: Register a brand new business ledger and create the Primary Admin/Owner.
    Public staff registration is disabled to prevent unauthorized company access.
    """
    clean_username = data.username.strip().lower()
    
    # Check if username already exists
    if users_col.find_one({"username": clean_username}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{clean_username}' is already taken. Please choose another username."
        )

    clean_bname = data.business_name.strip()
    clean_phone = data.phone.strip()
    clean_state = data.state.strip()

    # Create new business document in settings_col
    new_business = {
        "business_name": clean_bname,
        "gstin": (data.gstin or "").strip().upper(),
        "phone": clean_phone,
        "email": (data.email or "").strip(),
        "state": clean_state,
        "address": (data.address or "").strip(),
        "invoice_prefix": "INV",
        "next_invoice_number": 1,
        "bank_name": "",
        "bank_account_no": "",
        "bank_ifsc": "",
        "upi_id": "",
        "terms_conditions": "1. Goods once sold will not be returned.\n2. Payment due within 15 days of invoice date.",
        "textbee_api_url": "https://api.textbee.dev/api/v1",
        "textbee_api_key": "",
        "textbee_device_id": "",
        "textbee_demo_mode": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    res = settings_col.insert_one(new_business)
    biz_id = str(res.inserted_id)

    user_doc = {
        "username": clean_username,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name.strip(),
        "role": "admin",
        "business_id": biz_id,
        "business_name": clean_bname,
        "phone": clean_phone,
        "email": (data.email or "").strip(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    }
    user_res = users_col.insert_one(user_doc)
    user_id = str(user_res.inserted_id)

    token = create_access_token(user_id, clean_username, "admin")
    return {
        "message": f"Business '{clean_bname}' registered successfully!",
        "token": token,
        "user": {
            "id": user_id,
            "username": clean_username,
            "full_name": user_doc["full_name"],
            "role": "admin",
            "business_id": biz_id,
            "business_name": clean_bname
        },
        "business": serialize_doc(new_business)
    }

@router.post("/login")
def login(data: LoginRequest):
    """Authenticate username and password from MongoDB."""
    clean_username = data.username.strip().lower()
    user = users_col.find_one({"username": clean_username})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with this username. Please verify credentials."
        )

    # Security check: verify if staff account is active
    if user.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated by the business administrator. Please contact your manager."
        )
        
    if not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again."
        )
        
    token = create_access_token(str(user["_id"]), user["username"], user["role"])
    user_business = get_business_for_user(user)
    return {
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "full_name": user.get("full_name", user["username"]),
            "role": user["role"],
            "business_id": str(user.get("business_id", "")),
            "business_name": user.get("business_name", "")
        },
        "business": serialize_doc(user_business)
    }

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """Fetch current user profile and their specific business settings from MongoDB."""
    business = get_business_for_user(current_user)
    return {
        "user": current_user,
        "business": serialize_doc(business)
    }

# ==============================================================================
# ADMIN-ONLY 2-STEP STAFF MANAGEMENT WITH TEXTBEE OTP VERIFICATION
# ==============================================================================

@router.get("/staff")
def list_staff(admin_user: dict = Depends(require_admin)):
    """Admin-only: List all staff accounts belonging to this administrator's business."""
    b_id = admin_user.get("business_id")
    query = {"business_id": b_id, "role": {"$ne": "admin"}} if b_id else {"role": {"$ne": "admin"}}
    staff_members = list(users_col.find(query, {"password_hash": 0}).sort("created_at", -1))
    return serialize_doc(staff_members)

@router.post("/staff/send-otp")
def send_staff_authorization_otp(admin_user: dict = Depends(require_admin)):
    """
    Step 1 of 2-Step Staff Addition:
    Generates a secure 6-digit OTP and sends it to the Admin's registered phone via TextBee.
    """
    biz = get_business_for_user(admin_user)
    admin_phone = (biz.get("phone") or admin_user.get("phone") or "").strip()
    if not admin_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No phone number configured for this business. Please update your phone in Business Settings first."
        )

    # Generate 6-digit OTP
    otp_code = f"{random.randint(100000, 999999)}"
    admin_id_str = str(admin_user.get("id") or admin_user.get("_id"))

    # Invalidate any old pending staff OTPs for this admin
    otp_verifications_col.delete_many({"admin_id": admin_id_str, "purpose": "add_staff"})

    # Store OTP with auto-expiry
    otp_verifications_col.insert_one({
        "admin_id": admin_id_str,
        "business_id": str(biz.get("_id")),
        "otp": otp_code,
        "purpose": "add_staff",
        "created_at": datetime.now(timezone.utc)
    })

    # Dispatch SMS to Admin
    b_name = biz.get("business_name", "Your Business")
    dispatch_res = dispatch_otp_sms(admin_phone, otp_code, b_name, biz, admin_user)

    phone_hint = admin_phone[-4:] if len(admin_phone) >= 4 else admin_phone
    return {
        "success": True,
        "message": f"Authorization OTP sent to Admin's registered phone ending in •••• {phone_hint}.",
        "phone_hint": phone_hint,
        "demo_otp": dispatch_res.get("otp") if dispatch_res.get("mode") == "demo" else None
    }

@router.post("/staff/create")
def create_staff_with_otp(data: CreateStaffRequest, admin_user: dict = Depends(require_admin)):
    """
    Step 2 of 2-Step Staff Addition:
    Validates the 6-digit OTP received by the Admin, then creates the staff account.
    """
    admin_id_str = str(admin_user.get("id") or admin_user.get("_id"))
    clean_otp = data.otp.strip()

    # Verify OTP
    otp_record = otp_verifications_col.find_one({
        "admin_id": admin_id_str,
        "purpose": "add_staff",
        "otp": clean_otp
    })

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired authorization OTP. Please click 'Send OTP' to receive a new code."
        )

    clean_username = data.username.strip().lower()
    if users_col.find_one({"username": clean_username}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{clean_username}' is already taken. Please choose another username."
        )

    biz = get_business_for_user(admin_user)
    biz_id = str(biz.get("_id"))
    biz_name = biz.get("business_name", "")

    # Role validation: staff (Billing Cashier) or inventory_manager (Storekeeper)
    assigned_role = data.role if data.role in ("staff", "inventory_manager") else "staff"

    user_doc = {
        "username": clean_username,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name.strip(),
        "role": assigned_role,
        "business_id": biz_id,
        "business_name": biz_name,
        "phone": (data.phone or "").strip(),
        "email": (data.email or "").strip(),
        "is_active": True,
        "created_by": admin_user.get("username", "admin"),
        "created_at": datetime.now(timezone.utc)
    }
    user_res = users_col.insert_one(user_doc)
    user_id = str(user_res.inserted_id)

    # Delete consumed OTP so it cannot be reused
    otp_verifications_col.delete_one({"_id": otp_record["_id"]})

    return {
        "success": True,
        "message": f"Staff member '{clean_username}' ({assigned_role}) created successfully for {biz_name}!",
        "staff": {
            "id": user_id,
            "username": clean_username,
            "full_name": user_doc["full_name"],
            "role": assigned_role,
            "is_active": True,
            "business_id": biz_id
        }
    }

@router.patch("/staff/{staff_id}/toggle-status")
def toggle_staff_status(staff_id: str, admin_user: dict = Depends(require_admin)):
    """Admin-only: Instantly activate or deactivate a staff member's login access."""
    biz = get_business_for_user(admin_user)
    biz_id = str(biz.get("_id"))

    try:
        target = users_col.find_one({"_id": ObjectId(staff_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid staff ID format.")

    if not target or target.get("business_id") != biz_id:
        raise HTTPException(status_code=404, detail="Staff account not found under your business.")

    if target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Cannot deactivate primary administrator.")

    new_status = not target.get("is_active", True)
    users_col.update_one(
        {"_id": ObjectId(staff_id)},
        {"$set": {"is_active": new_status, "updated_at": datetime.now(timezone.utc)}}
    )

    action_label = "activated" if new_status else "deactivated"
    return {
        "success": True,
        "is_active": new_status,
        "message": f"Account '{target['username']}' has been {action_label} successfully."
    }

@router.delete("/staff/{staff_id}")
def delete_staff_account(staff_id: str, admin_user: dict = Depends(require_admin)):
    """Admin-only: Remove a staff account from this business."""
    biz = get_business_for_user(admin_user)
    biz_id = str(biz.get("_id"))

    try:
        target = users_col.find_one({"_id": ObjectId(staff_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid staff ID format.")

    if not target or target.get("business_id") != biz_id:
        raise HTTPException(status_code=404, detail="Staff account not found under your business.")

    if target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete primary administrator.")

    users_col.delete_one({"_id": ObjectId(staff_id)})
    return {
        "success": True,
        "message": f"Staff account '{target['username']}' permanently removed."
    }
