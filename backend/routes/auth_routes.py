from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional

from database import users_col, settings_col, serialize_doc
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
    role: str = "admin" # "admin" or "staff"
    business_name: Optional[str] = ""
    gstin: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    state: Optional[str] = "Maharashtra"
    address: Optional[str] = ""

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

@router.post("/signup")
def register_user(data: SignupRequest):
    """
    Sign up a new user (Admin or Staff) and save their profile in MongoDB.
    Allows multiple users to create accounts anytime.
    """
    clean_username = data.username.strip().lower()
    
    # Check if username already exists
    if users_col.find_one({"username": clean_username}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{clean_username}' is already taken. Please choose another."
        )

    # If this is the first user in the database, automatically grant Admin role
    total_users = users_col.count_documents({})
    assigned_role = "admin" if total_users == 0 else (data.role if data.role in ("admin", "staff") else "staff")

    user_doc = {
        "username": clean_username,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name.strip(),
        "role": assigned_role,
        "created_at": datetime.now(timezone.utc)
    }
    user_res = users_col.insert_one(user_doc)
    user_id = str(user_res.inserted_id)

    # If business details are provided or if no settings exist, update business_settings
    existing_settings = settings_col.find_one({})
    if not existing_settings or (data.business_name and data.business_name.strip()):
        b_name = data.business_name.strip() if data.business_name and data.business_name.strip() else f"{data.full_name.strip()}'s Business"
        settings_update = {
            "business_name": b_name,
            "gstin": (data.gstin or "").strip().upper(),
            "phone": (data.phone or "").strip(),
            "email": (data.email or "").strip(),
            "state": (data.state or "Maharashtra").strip(),
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
            "updated_at": datetime.now(timezone.utc)
        }
        settings_col.update_one({}, {"$set": settings_update}, upsert=True)

    token = create_access_token(user_id, clean_username, assigned_role)
    return {
        "message": f"Account '{clean_username}' created successfully!",
        "token": token,
        "user": {
            "id": user_id,
            "username": clean_username,
            "full_name": user_doc["full_name"],
            "role": assigned_role
        }
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
    return {
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "full_name": user.get("full_name", user["username"]),
            "role": user["role"]
        }
    }

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """Fetch current user profile and active business settings from MongoDB."""
    settings = settings_col.find_one({}) or {}
    clean_settings = serialize_doc(settings)
    return {
        "user": current_user,
        "business": clean_settings
    }

@router.get("/staff")
def list_staff(admin_user: dict = Depends(require_admin)):
    """Admin-only: List all staff accounts."""
    staff_members = list(users_col.find({}, {"password_hash": 0}).sort("created_at", -1))
    return serialize_doc(staff_members)
