from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field
from typing import Optional, List

from database import products_col, stock_movements_col, stock_inwards_col, serialize_doc
from auth import require_staff_or_admin, require_admin, require_inventory_or_admin
from services.stock_alert_service import (
    notify_stock_inward,
    send_restock_authorization_otp,
    verify_restock_otp,
    trigger_unverified_cron_reminder
)

router = APIRouter(prefix="/api/inventory", tags=["Inventory Management"])

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2)
    sku: str = Field(..., min_length=2)
    category: str = "General"
    unit: str = "Pcs"
    purchase_price: float = Field(..., ge=0)
    selling_price: float = Field(..., ge=0)
    stock_qty: float = Field(0.0, ge=0)
    low_stock_threshold: float = Field(5.0, ge=0)
    gst_rate: float = Field(18.0, ge=0)
    # Multi-unit & Packaging fields (e.g. 1 Box = 10 Pcs, 1 Strip = 10 Tabs, 1 Bag = 25 Kg)
    package_unit: Optional[str] = ""
    package_qty: Optional[float] = 1.0
    package_selling_price: Optional[float] = 0.0
    # Industry-specific fields
    batch_number: Optional[str] = ""
    expiry_date: Optional[str] = ""
    part_number: Optional[str] = ""
    description: Optional[str] = ""

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    stock_qty: Optional[float] = None
    low_stock_threshold: Optional[float] = None
    gst_rate: Optional[float] = None
    package_unit: Optional[str] = None
    package_qty: Optional[float] = None
    package_selling_price: Optional[float] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None
    part_number: Optional[str] = None
    description: Optional[str] = None

class RestockRequest(BaseModel):
    quantity: float = Field(..., gt=0)
    cost_price: Optional[float] = None
    notes: Optional[str] = "Manual restock"

class RequestRestockOtpRequest(BaseModel):
    product_id: str
    quantity: float = Field(..., gt=0)
    supplier_bill_no: str = Field(..., min_length=1)

class StockInwardRequest(BaseModel):
    product_id: str
    quantity: float = Field(..., gt=0)
    supplier_name: str = Field(..., min_length=2)
    supplier_bill_no: str = Field(..., min_length=1)
    supplier_bill_date: Optional[str] = ""
    cost_price: Optional[float] = None
    authorization_type: str = "NORMAL"  # "NORMAL", "SMS_OTP", "EMERGENCY_OVERRIDE"
    otp: Optional[str] = ""
    emergency_declaration: Optional[str] = ""

class InwardAuditRequest(BaseModel):
    action: str = Field(..., pattern="^(VERIFY|DISCREPANCY)$")
    actual_bill_qty: Optional[float] = None
    audit_notes: Optional[str] = ""

@router.get("")
def list_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = Query("all", pattern="^(all|in_stock|low_stock|out_of_stock)$"),
    user: dict = Depends(require_staff_or_admin)
):
    """List and filter products with search and stock status indicators."""
    query = {}
    
    if search:
        s = search.strip()
        query["$or"] = [
            {"name": {"$regex": s, "$options": "i"}},
            {"sku": {"$regex": s, "$options": "i"}},
            {"part_number": {"$regex": s, "$options": "i"}},
            {"batch_number": {"$regex": s, "$options": "i"}},
            {"category": {"$regex": s, "$options": "i"}}
        ]
        
    if category and category != "All":
        query["category"] = category

    cursor = products_col.find(query).sort("name", 1)
    products = list(cursor)
    
    # In-memory or query filtering for computed stock status
    results = []
    for p in products:
        stock = p.get("stock_qty", 0)
        threshold = p.get("low_stock_threshold", 5)
        
        if stock <= 0:
            p_status = "out_of_stock"
        elif stock <= threshold:
            p_status = "low_stock"
        else:
            p_status = "in_stock"
            
        p["stock_status"] = p_status
        # Confidentiality: conceal wholesale purchase costs from regular billing staff
        if user.get("role") == "staff":
            p["purchase_price"] = 0.0

        if status_filter == "all" or status_filter == p_status:
            results.append(p)
            
    # Distinct categories for frontend dropdown
    categories = sorted(products_col.distinct("category"))
    
    return {
        "products": serialize_doc(results),
        "total": len(results),
        "categories": categories
    }

@router.post("")
def add_product(data: ProductCreate, user: dict = Depends(require_inventory_or_admin)):
    """Add a new product with stock and initial stock movement log."""
    # Check duplicate SKU
    clean_sku = data.sku.strip().upper()
    if products_col.find_one({"sku": clean_sku}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A product with SKU '{clean_sku}' already exists."
        )

    product_doc = {
        "name": data.name.strip(),
        "sku": clean_sku,
        "category": data.category.strip() or "General",
        "unit": data.unit.strip() or "Pcs",
        "purchase_price": float(data.purchase_price),
        "selling_price": float(data.selling_price),
        "stock_qty": float(data.stock_qty),
        "low_stock_threshold": float(data.low_stock_threshold),
        "gst_rate": float(data.gst_rate),
        "package_unit": data.package_unit.strip() if data.package_unit else "",
        "package_qty": float(data.package_qty or 1.0),
        "package_selling_price": float(data.package_selling_price or 0.0),
        "batch_number": data.batch_number.strip() if data.batch_number else "",
        "expiry_date": data.expiry_date.strip() if data.expiry_date else "",
        "part_number": data.part_number.strip().upper() if data.part_number else "",
        "description": data.description.strip() if data.description else "",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    res = products_col.insert_one(product_doc)
    product_id = str(res.inserted_id)

    # Initial stock movement record if initial stock > 0
    if data.stock_qty > 0:
        stock_movements_col.insert_one({
            "product_id": ObjectId(product_id),
            "product_name": product_doc["name"],
            "sku": product_doc["sku"],
            "movement_type": "INITIAL_STOCK",
            "quantity_delta": data.stock_qty,
            "stock_after": data.stock_qty,
            "reference": "Initial Inventory Opening",
            "created_by": user.get("username", "system"),
            "created_at": datetime.now(timezone.utc)
        })

    return {
        "message": f"Product '{data.name}' added successfully.",
        "id": product_id
    }

# ==============================================================================
# STOCK INWARD SECURITY, HYBRID RESTOCK & AUDIT WORKFLOW
# ==============================================================================

@router.get("/inwards")
def list_stock_inwards(
    status_filter: Optional[str] = Query("all", pattern="^(all|PENDING_AUDIT|VERIFIED|FLAGGED_DISCREPANCY)$"),
    limit: int = 50,
    user: dict = Depends(require_inventory_or_admin)
):
    """List stock inward logs for the Admin Stock Audit Tray."""
    query = {}
    if status_filter != "all":
        query["status"] = status_filter
    cursor = stock_inwards_col.find(query).sort("created_at", -1).limit(limit)
    return serialize_doc(list(cursor))

@router.get("/inward/status/{product_id}")
def get_product_inward_audit_status(product_id: str, user: dict = Depends(require_staff_or_admin)):
    """Check if this product has any prior inward batches currently pending Admin audit."""
    try:
        pid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID.")
        
    pending_inwards = list(stock_inwards_col.find({"product_id": pid, "status": "PENDING_AUDIT"}).sort("created_at", -1))
    return {
        "product_id": product_id,
        "has_unverified": len(pending_inwards) > 0,
        "unverified_count": len(pending_inwards),
        "oldest_unverified": serialize_doc(pending_inwards[-1]) if pending_inwards else None,
        "latest_unverified": serialize_doc(pending_inwards[0]) if pending_inwards else None
    }

@router.post("/inward/request-otp")
def request_restock_otp(data: RequestRestockOtpRequest, user: dict = Depends(require_inventory_or_admin)):
    """Staff requests 6-digit Restock Authorization OTP sent via TextBee to Store Owner."""
    try:
        p = products_col.find_one({"_id": ObjectId(data.product_id)})
        if not p:
            raise HTTPException(status_code=404, detail="Product not found.")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID.")
        
    res = send_restock_authorization_otp(
        staff_user=user,
        product_name=p["name"],
        quantity=data.quantity,
        supplier_bill_no=data.supplier_bill_no.strip()
    )
    return res

@router.post("/inward")
def log_stock_inward(data: StockInwardRequest, user: dict = Depends(require_inventory_or_admin)):
    """
    Log stock inward: updates active stock immediately, saves audit record, and triggers instant SMS alert.
    Requires Owner OTP or Emergency Declaration if a prior batch is pending audit.
    """
    try:
        p = products_col.find_one({"_id": ObjectId(data.product_id)})
        if not p:
            raise HTTPException(status_code=404, detail="Product not found.")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID.")

    staff_id = str(user.get("id") or user.get("_id") or user.get("username"))
    staff_name = user.get("full_name") or user.get("username", "Staff")
    auth_type = data.authorization_type.upper().strip()
    clean_bill_no = data.supplier_bill_no.strip()
    clean_supp_name = data.supplier_name.strip()

    # Check unverified prior inwards for this product
    prior_pending = stock_inwards_col.find_one({"product_id": p["_id"], "status": "PENDING_AUDIT"})
    
    if prior_pending and auth_type == "NORMAL":
        if user.get("role") != "admin":
            prior_bill = prior_pending.get("supplier_bill_no", "Unknown")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Prior shipment from Bill #{prior_bill} is pending Admin audit. Please request Owner OTP or submit an Emergency Declaration to proceed."
            )

    # Validate OTP if auth_type is SMS_OTP
    if auth_type == "SMS_OTP":
        if not data.otp or not verify_restock_otp(staff_id, data.otp):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired Restock Authorization OTP. Please click 'Request OTP' to receive a new code."
            )

    # Validate Declaration if auth_type is EMERGENCY_OVERRIDE
    if auth_type == "EMERGENCY_OVERRIDE":
        if not data.emergency_declaration or len(data.emergency_declaration.strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Emergency declaration note must contain at least 10 characters explaining why restock is proceeding without prior audit."
            )

    # Credit active stock immediately
    new_stock = round(float(p.get("stock_qty", 0.0)) + float(data.quantity), 3)
    update_data = {
        "stock_qty": new_stock,
        "updated_at": datetime.now(timezone.utc)
    }
    if data.cost_price is not None and data.cost_price > 0:
        update_data["purchase_price"] = float(data.cost_price)

    products_col.update_one({"_id": p["_id"]}, {"$set": update_data})

    # Create stock_inwards record
    inward_doc = {
        "product_id": p["_id"],
        "product_name": p["name"],
        "sku": p.get("sku", ""),
        "quantity_received": float(data.quantity),
        "stock_after": new_stock,
        "supplier_name": clean_supp_name,
        "supplier_bill_no": clean_bill_no,
        "supplier_bill_date": data.supplier_bill_date or datetime.now().strftime("%Y-%m-%d"),
        "received_by_id": staff_id,
        "received_by_name": staff_name,
        "received_by_role": user.get("role", "staff"),
        "authorization_type": auth_type,
        "emergency_declaration": data.emergency_declaration.strip() if data.emergency_declaration else "",
        "status": "PENDING_AUDIT",
        "created_at": datetime.now(timezone.utc),
        "cron_reminder_sent": False
    }
    inward_res = stock_inwards_col.insert_one(inward_doc)
    inward_id = str(inward_res.inserted_id)

    # Record in stock movement ledger
    ref_text = f"Inward: {data.quantity} {p.get('unit', 'Pcs')} from {clean_supp_name} (Bill #{clean_bill_no}) [{auth_type}]"
    stock_movements_col.insert_one({
        "product_id": p["_id"],
        "product_name": p["name"],
        "sku": p.get("sku", ""),
        "movement_type": "STOCK_INWARD",
        "quantity_delta": float(data.quantity),
        "stock_after": new_stock,
        "reference": ref_text,
        "created_by": user.get("username", "staff"),
        "staff_name": staff_name,
        "inward_id": ObjectId(inward_id),
        "created_at": datetime.now(timezone.utc)
    })

    # Dispatch instant alert SMS to Store Owner
    sms_feedback = notify_stock_inward(
        staff_name=staff_name,
        product_name=p["name"],
        quantity=data.quantity,
        supplier_name=clean_supp_name,
        supplier_bill_no=clean_bill_no,
        auth_type=auth_type,
        declaration=data.emergency_declaration
    )

    return {
        "success": True,
        "message": f"Successfully logged {data.quantity} units into active inventory.",
        "inward_id": inward_id,
        "new_stock": new_stock,
        "sms_dispatched": sms_feedback.get("success", False),
        "sms_mode": sms_feedback.get("mode", "unknown")
    }

@router.post("/inward/{inward_id}/audit")
def audit_stock_inward(
    inward_id: str,
    data: InwardAuditRequest,
    admin_user: dict = Depends(require_admin)
):
    """Admin verifies inward or flags discrepancy against physical supplier bill."""
    try:
        inw = stock_inwards_col.find_one({"_id": ObjectId(inward_id)})
        if not inw:
            raise HTTPException(status_code=404, detail="Stock inward record not found.")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid inward ID.")

    action = data.action.upper()
    logged_qty = float(inw.get("quantity_received", 0.0))
    now_utc = datetime.now(timezone.utc)

    if action == "VERIFY":
        stock_inwards_col.update_one(
            {"_id": inw["_id"]},
            {
                "$set": {
                    "status": "VERIFIED",
                    "audited_by": admin_user.get("username", "admin"),
                    "audited_by_name": admin_user.get("full_name", "Admin"),
                    "audited_at": now_utc,
                    "audit_notes": data.audit_notes or "Supplier invoice verified and matched."
                }
            }
        )
        return {"success": True, "message": f"Inward for {inw['product_name']} marked as VERIFIED."}

    elif action == "DISCREPANCY":
        actual_qty = float(data.actual_bill_qty if data.actual_bill_qty is not None else logged_qty)
        shortage_qty = round(actual_qty - logged_qty, 3)
        
        audit_data = {
            "status": "FLAGGED_DISCREPANCY",
            "audited_by": admin_user.get("username", "admin"),
            "audited_by_name": admin_user.get("full_name", "Admin"),
            "audited_at": now_utc,
            "actual_bill_qty": actual_qty,
            "discrepancy_qty": shortage_qty,
            "audit_notes": data.audit_notes or f"Discrepancy: Physical bill shows {actual_qty}, logged was {logged_qty}."
        }
        stock_inwards_col.update_one({"_id": inw["_id"]}, {"$set": audit_data})

        # Permanent discrepancy record in movement ledger
        stock_movements_col.insert_one({
            "product_id": inw["product_id"],
            "product_name": inw["product_name"],
            "sku": inw.get("sku", ""),
            "movement_type": "AUDIT_DISCREPANCY",
            "quantity_delta": 0.0,
            "stock_after": inw.get("stock_after", 0.0),
            "reference": f"Audit Flag: Bill #{inw.get('supplier_bill_no')} shortage of {shortage_qty} units vs logged by {inw.get('received_by_name')}",
            "created_by": admin_user.get("username", "admin"),
            "staff_name": admin_user.get("full_name", "Admin"),
            "created_at": now_utc
        })

        return {
            "success": True,
            "message": f"Discrepancy of {shortage_qty} units recorded for Bill #{inw.get('supplier_bill_no')}.",
            "discrepancy_qty": shortage_qty
        }

@router.get("/cron/audit-reminder")
@router.post("/cron/audit-reminder")
def cron_audit_reminder():
    """Vercel cloud cron endpoint to trigger 12-hour audit reminders."""
    res = trigger_unverified_cron_reminder()
    return res

@router.get("/movements/ledger")
def get_stock_ledger(
    product_id: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(require_staff_or_admin)
):
    """Retrieve stock movement audit log."""
    query = {}
    if product_id:
        try:
            query["product_id"] = ObjectId(product_id)
        except Exception:
            pass
            
    cursor = stock_movements_col.find(query).sort("created_at", -1).limit(limit)
    return serialize_doc(list(cursor))

@router.get("/{product_id}")
def get_product(product_id: str, user: dict = Depends(require_staff_or_admin)):
    """Fetch single product details."""
    try:
        p = products_col.find_one({"_id": ObjectId(product_id)})
        if not p:
            raise HTTPException(status_code=404, detail="Product not found.")
        return serialize_doc(p)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid product ID: {str(e)}")

@router.put("/{product_id}")
def update_product(product_id: str, data: ProductUpdate, user: dict = Depends(require_inventory_or_admin)):
    """Update existing product details and record stock adjustment if changed."""
    try:
        existing = products_col.find_one({"_id": ObjectId(product_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID.")
        
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found.")

    update_fields = {"updated_at": datetime.now(timezone.utc)}
    
    if data.name is not None:
        update_fields["name"] = data.name.strip()
    if data.sku is not None:
        clean_sku = data.sku.strip().upper()
        if clean_sku != existing.get("sku"):
            if products_col.find_one({"sku": clean_sku, "_id": {"$ne": ObjectId(product_id)}}):
                raise HTTPException(status_code=400, detail=f"SKU '{clean_sku}' is used by another product.")
            update_fields["sku"] = clean_sku
    if data.category is not None:
        update_fields["category"] = data.category.strip()
    if data.unit is not None:
        update_fields["unit"] = data.unit.strip()
    if data.purchase_price is not None:
        update_fields["purchase_price"] = float(data.purchase_price)
    if data.selling_price is not None:
        update_fields["selling_price"] = float(data.selling_price)
    if data.low_stock_threshold is not None:
        update_fields["low_stock_threshold"] = float(data.low_stock_threshold)
    if data.gst_rate is not None:
        update_fields["gst_rate"] = float(data.gst_rate)
    if data.package_unit is not None:
        update_fields["package_unit"] = data.package_unit.strip()
    if data.package_qty is not None:
        update_fields["package_qty"] = float(data.package_qty)
    if data.package_selling_price is not None:
        update_fields["package_selling_price"] = float(data.package_selling_price)
    if data.batch_number is not None:
        update_fields["batch_number"] = data.batch_number.strip()
    if data.expiry_date is not None:
        update_fields["expiry_date"] = data.expiry_date.strip()
    if data.part_number is not None:
        update_fields["part_number"] = data.part_number.strip().upper()
    if data.description is not None:
        update_fields["description"] = data.description.strip()

    # Handle manual stock adjustment
    if data.stock_qty is not None and data.stock_qty != existing.get("stock_qty"):
        new_stock = float(data.stock_qty)
        delta = round(new_stock - float(existing.get("stock_qty", 0)), 3)
        update_fields["stock_qty"] = new_stock
        
        stock_movements_col.insert_one({
            "product_id": ObjectId(product_id),
            "product_name": existing["name"],
            "sku": existing["sku"],
            "movement_type": "MANUAL_ADJUSTMENT",
            "quantity_delta": delta,
            "stock_after": new_stock,
            "reference": "Inventory manual correction",
            "created_by": user.get("username", "system"),
            "created_at": datetime.now(timezone.utc)
        })

    products_col.update_one({"_id": ObjectId(product_id)}, {"$set": update_fields})
    return {"message": "Product updated successfully."}

@router.post("/{product_id}/restock")
def restock_product(product_id: str, data: RestockRequest, user: dict = Depends(require_inventory_or_admin)):
    """Restock an existing product quantity and log movement."""
    try:
        p = products_col.find_one({"_id": ObjectId(product_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID.")
        
    if not p:
        raise HTTPException(status_code=404, detail="Product not found.")

    new_stock = round(float(p.get("stock_qty", 0)) + float(data.quantity), 3)
    update_data = {
        "stock_qty": new_stock,
        "updated_at": datetime.now(timezone.utc)
    }
    if data.cost_price is not None:
        update_data["purchase_price"] = float(data.cost_price)

    products_col.update_one({"_id": ObjectId(product_id)}, {"$set": update_data})
    
    stock_movements_col.insert_one({
        "product_id": ObjectId(product_id),
        "product_name": p["name"],
        "sku": p["sku"],
        "movement_type": "PURCHASE_RESTOCK",
        "quantity_delta": data.quantity,
        "stock_after": new_stock,
        "reference": data.notes or "Stock replenishment",
        "created_by": user.get("username", "system"),
        "created_at": datetime.now(timezone.utc)
    })

    return {
        "message": f"Successfully added {data.quantity} units to stock.",
        "new_stock": new_stock
    }

@router.delete("/{product_id}")
def delete_product(product_id: str, admin_user: dict = Depends(require_admin)):
    """Admin-only: Delete a product from inventory."""
    try:
        res = products_col.delete_one({"_id": ObjectId(product_id)})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Product not found.")
        return {"message": "Product deleted from inventory."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
