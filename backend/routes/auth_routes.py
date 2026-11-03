from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, List

from database import users_col, settings_col, serialize_doc, get_business_for_user
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin
)

router = APIRouter(prefix="/api/auth", tags=["Authentication & Registration"])

class SignupRequest(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    signup_type: str = "new_business" # "new_business" or "join_staff"
    business_id: Optional[str] = None # required when signup_type == "join_staff"
    business_name: Optional[str] = "" # required when signup_type == "new_business"
    gstin: Optional[str] = ""
    phone: Optional[str] = ""          # required when signup_type == "new_business"
    email: Optional[str] = ""
    state: Optional[str] = "Maharashtra" # required when signup_type == "new_business"
    address: Optional[str] = ""
    role: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

@router.get("/status")
def get_auth_status():
    """Check how many registered accounts exist in MongoDB."""
    user_count = users_col.count_documents({})
    return {
        "user_count": user_count,
        "initialized": user_count > 0
    }

@router.get("/businesses")
def list_registered_businesses():
    """
    Public endpoint: Return registered businesses list (ID, Name, State, Phone)
    so new staff can select their business from the dropdown during sign up.
    """
    businesses = list(settings_col.find({}, {"_id": 1, "business_name": 1, "state": 1, "phone": 1, "gstin": 1}).sort("business_name", 1))
    result = []
    for b in businesses:
        name = b.get("business_name", "").strip()
        if name:
            result.append({
                "id": str(b["_id"]),
                "business_name": name,
                "state": b.get("state", "Maharashtra"),
                "phone": b.get("phone", ""),
                "gstin": b.get("gstin", "")
            })
    return result

@router.post("/signup")
def register_user(data: SignupRequest):
    """
    Sign up a new user and associate them with either a new business or an existing business.
    - If signup_type == 'new_business': creates a new business document and makes user Admin.
    - If signup_type == 'join_staff': links user to chosen existing business and makes user Staff.
    """
    clean_username = data.username.strip().lower()
    
    # Check if username already exists
    if users_col.find_one({"username": clean_username}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{clean_username}' is already taken. Please choose another username."
        )

    # Branch according to signup type
    if data.signup_type == "join_staff":
        # Staff joining an existing business
        if not data.business_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please select a business / store from the dropdown to join as staff."
            )
        try:
            target_biz = settings_col.find_one({"_id": ObjectId(data.business_id)})
        except Exception:
            target_biz = None

        if not target_biz:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected business could not be found. Please pick a registered business."
            )

        biz_id = str(target_biz["_id"])
        biz_name = target_biz.get("business_name", "Business")
        assigned_role = "staff"

    else:
        # Registering a brand new business (Admin)
        clean_bname = (data.business_name or "").strip()
        if not clean_bname:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Business / Shop Name is required when registering a new business."
            )
        clean_phone = (data.phone or "").strip()
        if not clean_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Business Contact Phone number is required."
            )
        clean_state = (data.state or "").strip()
        if not clean_state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Business Place / State is required for GST compliance."
            )

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
        biz_name = clean_bname
        assigned_role = "admin"

    user_doc = {
        "username": clean_username,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name.strip(),
        "role": assigned_role,
        "business_id": biz_id,
        "business_name": biz_name,
        "phone": (data.phone or "").strip(),
        "email": (data.email or "").strip(),
        "created_at": datetime.now(timezone.utc)
    }
    user_res = users_col.insert_one(user_doc)
    user_id = str(user_res.inserted_id)

    token = create_access_token(user_id, clean_username, assigned_role)
    current_business = settings_col.find_one({"_id": ObjectId(biz_id)}) or {}
    return {
        "message": f"Account '{clean_username}' registered successfully for {biz_name}!",
        "token": token,
        "user": {
            "id": user_id,
            "username": clean_username,
            "full_name": user_doc["full_name"],
            "role": assigned_role,
            "business_id": biz_id,
            "business_name": biz_name
        },
        "business": serialize_doc(current_business)
    }

@router.post("/login")
def login(data: LoginRequest):
    """Authenticate username and password from MongoDB."""
    clean_username = data.username.strip().lower()
    user = users_col.find_one({"username": clean_username})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with this username. Please sign up first."
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

@router.get("/staff")
def list_staff(admin_user: dict = Depends(require_admin)):
    """Admin-only: List staff accounts belonging to this administrator's business."""
    b_id = admin_user.get("business_id")
    query = {"business_id": b_id} if b_id else {}
    staff_members = list(users_col.find(query, {"password_hash": 0}).sort("created_at", -1))
    return serialize_doc(staff_members)
