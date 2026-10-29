from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field
from typing import Optional, List

from database import products_col, stock_movements_col, serialize_doc
from auth import require_staff_or_admin, require_admin

router = APIRouter(prefix="/api/inventory", tags=["Inventory Management"])

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2)
    sku: str = Field(..., min_length=2)
    category: str = "General"
    unit: str = "Pcs"
    purchase_price: float = Field(..., ge=0)
    selling_price: float = Field(..., ge=0)
    stock_qty: int = Field(0, ge=0)
    low_stock_threshold: int = Field(5, ge=0)
    gst_rate: float = Field(18.0, ge=0)
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
    stock_qty: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    gst_rate: Optional[float] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None
    part_number: Optional[str] = None
    description: Optional[str] = None

class RestockRequest(BaseModel):
    quantity: int = Field(..., gt=0)
    cost_price: Optional[float] = None
    notes: Optional[str] = "Manual restock"

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
def add_product(data: ProductCreate, user: dict = Depends(require_staff_or_admin)):
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
        "stock_qty": int(data.stock_qty),
        "low_stock_threshold": int(data.low_stock_threshold),
        "gst_rate": float(data.gst_rate),
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
def update_product(product_id: str, data: ProductUpdate, user: dict = Depends(require_staff_or_admin)):
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
        update_fields["low_stock_threshold"] = int(data.low_stock_threshold)
    if data.gst_rate is not None:
        update_fields["gst_rate"] = float(data.gst_rate)
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
        new_stock = int(data.stock_qty)
        delta = new_stock - existing.get("stock_qty", 0)
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
def restock_product(product_id: str, data: RestockRequest, user: dict = Depends(require_staff_or_admin)):
    """Restock an existing product quantity and log movement."""
    try:
        p = products_col.find_one({"_id": ObjectId(product_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID.")
        
    if not p:
        raise HTTPException(status_code=404, detail="Product not found.")

    new_stock = p.get("stock_qty", 0) + data.quantity
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
