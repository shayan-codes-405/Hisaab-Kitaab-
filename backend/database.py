import logging
from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, DuplicateKeyError
from config import MONGO_URI, DATABASE_NAME

logger = logging.getLogger("hisabkitab.database")

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    db = client[DATABASE_NAME]
    # Check connection
    client.server_info()
    logger.info(f"Connected to MongoDB successfully at {MONGO_URI}, DB: {DATABASE_NAME}")
except ConnectionFailure as e:
    logger.error(f"Could not connect to MongoDB: {e}")
    raise e

# Define Collections
users_col = db["users"]
settings_col = db["business_settings"]
products_col = db["products"]
invoices_col = db["invoices"]
stock_movements_col = db["stock_movements"]
sms_logs_col = db["sms_logs"]
otp_verifications_col = db["otp_verifications"]
stock_inwards_col = db["stock_inwards"]
vendor_claims_col = db["vendor_debit_claims"]
promotional_gifts_col = db["promotional_gifts"]

def init_db_indexes():
    """Ensure all mandatory unique and performance indexes exist."""
    try:
        # Unique username
        users_col.create_index([("username", ASCENDING)], unique=True)
        # Unique product SKU
        products_col.create_index([("sku", ASCENDING)], unique=True)
        # Product category index
        products_col.create_index([("category", ASCENDING)])
        # Unique Invoice Number
        invoices_col.create_index([("invoice_number", ASCENDING)], unique=True)
        # Invoice date & status indexes
        invoices_col.create_index([("invoice_date", DESCENDING)])
        invoices_col.create_index([("payment_status", ASCENDING)])
        # Stock movements tracking
        stock_movements_col.create_index([("product_id", ASCENDING), ("created_at", DESCENDING)])
        # Stock inwards security & audit tracking
        stock_inwards_col.create_index([("product_id", ASCENDING), ("created_at", DESCENDING)])
        stock_inwards_col.create_index([("status", ASCENDING)])
        stock_inwards_col.create_index([("created_at", DESCENDING)])
        # Vendor debit claims & shortage tracking
        vendor_claims_col.create_index([("supplier_name", ASCENDING), ("status", ASCENDING)])
        vendor_claims_col.create_index([("created_at", DESCENDING)])
        # Promotional and festival gift tracking
        promotional_gifts_col.create_index([("status", ASCENDING), ("created_at", DESCENDING)])
        promotional_gifts_col.create_index([("allocation_type", ASCENDING)])
        # SMS audit logs
        sms_logs_col.create_index([("created_at", DESCENDING)])
        # 10-minute auto-expiring TTL index for OTP verification codes
        otp_verifications_col.create_index([("created_at", ASCENDING)], expireAfterSeconds=600)
        logger.info("MongoDB indexes verified successfully.")
    except Exception as e:
        logger.warning(f"Index initialization warning: {e}")

def serialize_doc(doc):
    """Recursively convert MongoDB document (ObjectId, datetime) to JSON serializable dict."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        new_doc = {}
        for k, v in doc.items():
            if k == "_id":
                new_doc["id"] = str(v)
            elif isinstance(v, ObjectId):
                new_doc[k] = str(v)
            elif isinstance(v, datetime):
                new_doc[k] = v.isoformat()
            elif isinstance(v, (dict, list)):
                new_doc[k] = serialize_doc(v)
            else:
                new_doc[k] = v
        return new_doc
    return doc

def get_business_for_user(user: dict) -> dict:
    """
    Retrieve the specific business settings document associated with the user.
    Checks user['business_id'] first, then user['business_name'],
    falling back to the first available business document in settings_col.
    """
    if not user:
        return settings_col.find_one({}) or {}

    b_id = user.get("business_id")
    if b_id:
        try:
            b = settings_col.find_one({"_id": ObjectId(b_id)})
            if b:
                return b
        except Exception:
            pass

    b_name = user.get("business_name")
    if b_name:
        b = settings_col.find_one({"business_name": b_name})
        if b:
            return b

    # Graceful fallback to first business or empty dict
    return settings_col.find_one({}) or {}
