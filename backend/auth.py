import os
import hmac
import hashlib
import json
import base64
import time
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException, status, Header, Depends
from config import SECRET_KEY, TOKEN_EXPIRE_HOURS
from database import users_col, serialize_doc

def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with unique 16-byte random salt."""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 260000)
    return f"pbkdf2_sha256${salt.hex()}${dk.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify raw password against stored salted hash."""
    try:
        parts = hashed_password.split('$')
        if len(parts) != 3 or parts[0] != 'pbkdf2_sha256':
            return False
        salt = bytes.fromhex(parts[1])
        expected_dk = bytes.fromhex(parts[2])
        actual_dk = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 260000)
        return hmac.compare_digest(actual_dk, expected_dk)
    except Exception:
        return False

def create_access_token(user_id: str, username: str, role: str) -> str:
    """Generate cryptographically signed, tamper-proof bearer token with expiration."""
    exp = int(time.time()) + (TOKEN_EXPIRE_HOURS * 3600)
    payload = {
        "uid": str(user_id),
        "sub": username,
        "role": role,
        "exp": exp
    }
    payload_json = json.dumps(payload, separators=(',', ':'))
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode('utf-8')).decode('utf-8').rstrip('=')
    signature = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')
    return f"{payload_b64}.{sig_b64}"

def decode_access_token(token: str) -> dict:
    """Validate token signature and expiration, returning user claims payload."""
    try:
        parts = token.split('.')
        if len(parts) != 2:
            raise ValueError("Malformed token format")
        payload_b64, sig_b64 = parts[0], parts[1]
        
        # Verify signature
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).digest()
        actual_sig = base64.urlsafe_b64decode(sig_b64 + '=' * (-len(sig_b64) % 4))
        if not hmac.compare_digest(expected_sig, actual_sig):
            raise ValueError("Invalid signature")
        
        # Parse payload
        payload_bytes = base64.urlsafe_b64decode(payload_b64 + '=' * (-len(payload_b64) % 4))
        payload = json.loads(payload_bytes.decode('utf-8'))
        
        # Check expiry
        if payload.get("exp", 0) < int(time.time()):
            raise ValueError("Token has expired")
            
        return payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication token invalid or expired: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(authorization: str = Header(None)) -> dict:
    """FastAPI Dependency: Extract and authenticate current active user from Authorization header."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization scheme. Use 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = parts[1]
    claims = decode_access_token(token)
    
    try:
        user = users_col.find_one({"_id": ObjectId(claims["uid"])})
    except Exception:
        user = users_col.find_one({"username": claims["sub"]})
        
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return serialize_doc(user)

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """FastAPI Dependency: Restrict route strictly to Admin role."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required for this action."
        )
    return current_user

def require_staff_or_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """FastAPI Dependency: Permits both Staff and Admin."""
    if current_user.get("role") not in ("admin", "staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to authorized business staff."
        )
    return current_user
