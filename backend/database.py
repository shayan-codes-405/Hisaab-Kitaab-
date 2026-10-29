import logging
from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, DuplicateKeyError
from config import MONGO_URI, DATABASE_NAME

logger = logging.getLogger("hisabkitab.database")

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
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
        # SMS audit logs
        sms_logs_col.create_index([("created_at", DESCENDING)])
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
