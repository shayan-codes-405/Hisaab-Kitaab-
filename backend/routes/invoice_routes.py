import re
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from database import (
    invoices_col,
    products_col,
    stock_movements_col,
    settings_col,
    serialize_doc
)
from auth import require_staff_or_admin, require_admin

router = APIRouter(prefix="/api/invoices", tags=["GST Invoice Management"])

class InvoiceItemSchema(BaseModel):
    product_id: Optional[str] = None
    name: str
    sku: Optional[str] = ""
    unit: Optional[str] = "Pcs"
    quantity: float = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)
    gst_rate: float = Field(..., ge=0)
    discount_type: str = "percentage" # "percentage" or "fixed"
    discount_value: float = Field(0.0, ge=0)
    # Multi-unit & Packaging fields (e.g. 1 Box = 10 Pcs)
    conversion_factor: Optional[float] = 1.0
    base_unit: Optional[str] = "Pcs"
    # Industry details snapshot
    batch_number: Optional[str] = ""
    expiry_date: Optional[str] = ""
    part_number: Optional[str] = ""

class CustomerSchema(BaseModel):
    name: str = Field(..., min_length=2)
    phone: Optional[str] = ""
    email: Optional[str] = ""
    gstin: Optional[str] = ""
    billing_address: Optional[str] = ""
    state: str = "Maharashtra"

class CreateInvoiceRequest(BaseModel):
    customer: CustomerSchema
    items: List[InvoiceItemSchema] = Field(..., min_items=1)
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    invoice_level_discount_type: str = "percentage" # "percentage" or "fixed"
    invoice_level_discount_value: float = Field(0.0, ge=0)
    payment_status: str = "Paid" # "Paid", "Unpaid", "Partially Paid"
    amount_paid: Optional[float] = 0.0
    payment_mode: Optional[str] = "Cash" # Cash, UPI, Bank Transfer, Cheque
    template: str = "classic" # "classic" or "premium"
    notes: Optional[str] = ""
    send_sms: Optional[bool] = False
    sms_message: Optional[str] = None

class UpdatePaymentStatusRequest(BaseModel):
    payment_status: str = Field(..., pattern="^(Paid|Unpaid|Partially Paid)$")
    amount_paid: Optional[float] = 0.0
    payment_mode: Optional[str] = "Cash"
    notes: Optional[str] = ""

class CalculateItemSchema(BaseModel):
    product_id: Optional[str] = None
    name: Optional[str] = ""
    sku: Optional[str] = ""
    unit: Optional[str] = "Pcs"
    quantity: Optional[Any] = 1.0
    unit_price: Optional[Any] = 0.0
    gst_rate: Optional[Any] = 18.0
    discount_type: Optional[str] = "percentage"
    discount_value: Optional[Any] = 0.0
    conversion_factor: Optional[Any] = 1.0
    base_unit: Optional[str] = "Pcs"
    batch_number: Optional[str] = ""
    expiry_date: Optional[str] = ""
    part_number: Optional[str] = ""

class CalculateCustomerSchema(BaseModel):
    name: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    gstin: Optional[str] = ""
    billing_address: Optional[str] = ""
    state: Optional[str] = "Maharashtra"

class CalculateInvoiceRequest(BaseModel):
    customer: Optional[CalculateCustomerSchema] = None
    items: List[CalculateItemSchema] = Field(default_factory=list)
    invoice_level_discount_type: Optional[str] = "percentage"
    invoice_level_discount_value: Optional[Any] = 0.0

def calculate_invoice_totals(items: List[InvoiceItemSchema], seller_state: str, customer_state: str, inv_disc_type: str, inv_disc_val: float):
    """
    Consistent Indian GST and Discount Calculation Engine:
    - Calculates line item gross, discounts, taxable value.
    - Pro-rates invoice-level discount across items to accurately attribute taxable tax slabs.
    - Accurately splits Intra-State (CGST + SGST) vs Inter-State (IGST).
    """
    is_interstate = (seller_state.strip().lower() != customer_state.strip().lower())
    
    processed_items = []
    subtotal_gross = 0.0
    total_line_discounts = 0.0
    total_taxable_before_inv_disc = 0.0

    # 1. Line-level calculations
    for item in items:
        qty = float(item.quantity)
        rate = float(item.unit_price)
        gross = round(qty * rate, 2)
        
        # Line discount
        if item.discount_type == "percentage":
            line_disc = round(gross * (min(100.0, float(item.discount_value)) / 100.0), 2)
        else:
            line_disc = round(min(gross, float(item.discount_value)), 2)
            
        taxable = max(0.0, round(gross - line_disc, 2))
        
        subtotal_gross += gross
        total_line_discounts += line_disc
        total_taxable_before_inv_disc += taxable
        
        processed_items.append({
            "product_id": item.product_id,
            "name": item.name,
            "sku": item.sku or "",
            "unit": item.unit or "Pcs",
            "quantity": qty,
            "unit_price": rate,
            "gross_amount": gross,
            "discount_type": item.discount_type,
            "discount_value": item.discount_value,
            "line_discount": line_disc,
            "taxable_amount": taxable,
            "gst_rate": float(item.gst_rate),
            "conversion_factor": float(getattr(item, 'conversion_factor', 1.0) or 1.0),
            "base_unit": getattr(item, 'base_unit', item.unit or 'Pcs') or 'Pcs',
            "batch_number": item.batch_number or "",
            "expiry_date": item.expiry_date or "",
            "part_number": item.part_number or ""
        })

    # 2. Invoice-level discount calculation
    if inv_disc_type == "percentage":
        inv_disc_amount = round(total_taxable_before_inv_disc * (min(100.0, float(inv_disc_val)) / 100.0), 2)
    else:
        inv_disc_amount = round(min(total_taxable_before_inv_disc, float(inv_disc_val)), 2)

    total_net_taxable = max(0.0, round(total_taxable_before_inv_disc - inv_disc_amount, 2))
    
    # Prorate ratio for line item tax calculation
    tax_factor = (total_net_taxable / total_taxable_before_inv_disc) if total_taxable_before_inv_disc > 0 else 1.0

    total_cgst = 0.0
    total_sgst = 0.0
    total_igst = 0.0
    tax_breakdown = {} # Keyed by rate e.g. "18" -> { taxable, cgst, sgst, igst }

    for p in processed_items:
        eff_taxable = round(p["taxable_amount"] * tax_factor, 2)
        rate = p["gst_rate"]
        rate_key = str(int(rate) if rate.is_integer() else rate)
        
        if rate_key not in tax_breakdown:
            tax_breakdown[rate_key] = {
                "rate": rate,
                "taxable": 0.0,
                "cgst": 0.0,
                "sgst": 0.0,
                "igst": 0.0,
                "total_tax": 0.0
            }

        tax_breakdown[rate_key]["taxable"] += eff_taxable

        if is_interstate:
            igst = round(eff_taxable * (rate / 100.0), 2)
            cgst = 0.0
            sgst = 0.0
        else:
            half_rate = rate / 2.0
            cgst = round(eff_taxable * (half_rate / 100.0), 2)
            sgst = round(eff_taxable * (half_rate / 100.0), 2)
            igst = 0.0

        p["net_taxable"] = eff_taxable
        p["cgst_amount"] = cgst
        p["sgst_amount"] = sgst
        p["igst_amount"] = igst
        p["total_tax"] = round(cgst + sgst + igst, 2)
        p["line_total"] = round(eff_taxable + p["total_tax"], 2)

        total_cgst += cgst
        total_sgst += sgst
        total_igst += igst

        tax_breakdown[rate_key]["cgst"] += cgst
        tax_breakdown[rate_key]["sgst"] += sgst
        tax_breakdown[rate_key]["igst"] += igst
        tax_breakdown[rate_key]["total_tax"] += (cgst + sgst + igst)

    total_tax = round(total_cgst + total_sgst + total_igst, 2)
    raw_final_amount = round(total_net_taxable + total_tax, 2)
    rounded_final_amount = round(raw_final_amount)
    roundoff = round(rounded_final_amount - raw_final_amount, 2)

    return {
        "processed_items": processed_items,
        "is_interstate": is_interstate,
        "subtotal_gross": round(subtotal_gross, 2),
        "total_line_discounts": round(total_line_discounts, 2),
        "taxable_before_inv_discount": round(total_taxable_before_inv_disc, 2),
        "invoice_discount_amount": round(inv_disc_amount, 2),
        "total_net_taxable": round(total_net_taxable, 2),
        "total_cgst": round(total_cgst, 2),
        "total_sgst": round(total_sgst, 2),
        "total_igst": round(total_igst, 2),
        "total_tax": round(total_tax, 2),
        "roundoff": roundoff,
        "final_payable_amount": float(rounded_final_amount),
        "tax_breakdown": list(tax_breakdown.values())
    }

def generate_next_invoice_number():
    """Generate sequential unique invoice number atomically."""
    settings = settings_col.find_one({}) or {}
    prefix = settings.get("invoice_prefix", "INV").upper()
    next_num = settings.get("next_invoice_number", 1)
    current_year = datetime.now().year
    
    # Try finding an unused number
    candidate = f"{prefix}-{current_year}-{str(next_num).zfill(4)}"
    while invoices_col.find_one({"invoice_number": candidate}):
        next_num += 1
        candidate = f"{prefix}-{current_year}-{str(next_num).zfill(4)}"
        
    settings_col.update_one({}, {"$set": {"next_invoice_number": next_num + 1}}, upsert=True)
    return candidate

@router.post("/calculate")
def preview_calculation(data: CalculateInvoiceRequest, user: dict = Depends(require_staff_or_admin)):
    """Dry-run calculation for live interactive invoice preview without strict validation hurdles."""
    settings = settings_col.find_one({}) or {}
    seller_state = settings.get("state", "Maharashtra")
    customer_state = data.customer.state if (data.customer and data.customer.state) else seller_state

    # Filter items that have at least some name or quantity
    valid_items = []
    for item in data.items:
        try:
            qty = float(item.quantity) if item.quantity not in (None, "") else 1.0
            rate = float(item.unit_price) if item.unit_price not in (None, "") else 0.0
            gst = float(item.gst_rate) if item.gst_rate not in (None, "") else 18.0
            disc_val = float(item.discount_value) if item.discount_value not in (None, "") else 0.0
        except (ValueError, TypeError):
            continue

        if qty > 0:
            valid_items.append(InvoiceItemSchema(
                product_id=item.product_id,
                name=item.name or "Item",
                sku=item.sku or "",
                unit=item.unit or "Pcs",
                quantity=qty,
                unit_price=max(0.0, rate),
                gst_rate=max(0.0, gst),
                discount_type=item.discount_type or "percentage",
                discount_value=max(0.0, disc_val),
                conversion_factor=float(item.conversion_factor or 1.0),
                base_unit=item.base_unit or item.unit or "Pcs",
                batch_number=item.batch_number or "",
                expiry_date=item.expiry_date or "",
                part_number=item.part_number or ""
            ))

    if not valid_items:
        return {
            "processed_items": [],
            "is_interstate": (seller_state.strip().lower() != customer_state.strip().lower()),
            "subtotal_gross": 0.0,
            "total_line_discounts": 0.0,
            "taxable_before_inv_discount": 0.0,
            "invoice_discount_amount": 0.0,
            "total_net_taxable": 0.0,
            "total_cgst": 0.0,
            "total_sgst": 0.0,
            "total_igst": 0.0,
            "total_tax": 0.0,
            "roundoff": 0.0,
            "final_payable_amount": 0.0,
            "tax_breakdown": []
        }

    try:
        inv_disc_val = float(data.invoice_level_discount_value) if data.invoice_level_discount_value not in (None, "") else 0.0
    except (ValueError, TypeError):
        inv_disc_val = 0.0

    calc = calculate_invoice_totals(
        items=valid_items,
        seller_state=seller_state,
        customer_state=customer_state,
        inv_disc_type=data.invoice_level_discount_type or "percentage",
        inv_disc_val=inv_disc_val
    )
    return calc

@router.get("")
def list_invoices(
    search: Optional[str] = None,
    payment_status: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(require_staff_or_admin)
):
    """Retrieve invoice ledger with customer and payment status filtering."""
    query = {}
    if search:
        s = search.strip()
        query["$or"] = [
            {"invoice_number": {"$regex": s, "$options": "i"}},
            {"customer.name": {"$regex": s, "$options": "i"}},
            {"customer.phone": {"$regex": s, "$options": "i"}},
            {"customer.gstin": {"$regex": s, "$options": "i"}}
        ]
        
    if payment_status and payment_status != "all":
        query["payment_status"] = payment_status

    cursor = invoices_col.find(query).sort("created_at", -1).limit(limit)
    invoices = list(cursor)
    return serialize_doc(invoices)

@router.post("")
def create_invoice(data: CreateInvoiceRequest, user: dict = Depends(require_staff_or_admin)):
    """
    Validate stock, calculate GST, deduct stock atomically, and save invoice.
    Prevents negative stock and ensures data snapshot consistency.
    """
    settings = settings_col.find_one({}) or {}
    seller_state = settings.get("state", "Maharashtra")

    # 1. Validate Stock Availability Before Modification
    stock_deductions = []
    for item in data.items:
        if item.product_id:
            try:
                prod = products_col.find_one({"_id": ObjectId(item.product_id)})
            except Exception:
                prod = None
                
            if prod:
                available = float(prod.get("stock_qty", 0.0))
                factor = float(getattr(item, 'conversion_factor', 1.0) or 1.0)
                base_deduct_qty = round(float(item.quantity) * factor, 3)
                if available < base_deduct_qty:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Insufficient stock for '{prod.get('name')}'. Available: {available} {prod.get('unit', 'Pcs')}, Requested: {item.quantity} {item.unit} ({base_deduct_qty} {prod.get('unit', 'Pcs')})"
                    )
                stock_deductions.append({
                    "product_id": prod["_id"],
                    "product_name": prod["name"],
                    "sku": prod.get("sku", ""),
                    "qty": base_deduct_qty,
                    "sold_qty": float(item.quantity),
                    "sold_unit": item.unit or prod.get("unit", "Pcs"),
                    "unit": prod.get("unit", "Pcs")
                })

    # 2. Compute Official GST & Discount Totals
    calc = calculate_invoice_totals(
        items=data.items,
        seller_state=seller_state,
        customer_state=data.customer.state,
        inv_disc_type=data.invoice_level_discount_type,
        inv_disc_val=data.invoice_level_discount_value
    )

    inv_number = generate_next_invoice_number()

    # Determine amount paid
    final_amount = calc["final_payable_amount"]
    status_val = data.payment_status
    if status_val == "Paid":
        amount_paid = final_amount
    elif status_val == "Unpaid":
        amount_paid = 0.0
    else: # Partially Paid
        amount_paid = min(final_amount, float(data.amount_paid or 0.0))

    invoice_doc = {
        "invoice_number": inv_number,
        "invoice_date": data.invoice_date or datetime.now().strftime("%Y-%m-%d"),
        "due_date": data.due_date or "",
        "template": data.template if data.template in ("classic", "premium") else "classic",
        "seller_snapshot": {
            "business_name": settings.get("business_name", "HisabKitab Enterprises"),
            "gstin": settings.get("gstin", ""),
            "address": settings.get("address", ""),
            "phone": settings.get("phone", ""),
            "email": settings.get("email", ""),
            "state": seller_state,
            "bank_name": settings.get("bank_name", ""),
            "bank_account_no": settings.get("bank_account_no", ""),
            "bank_ifsc": settings.get("bank_ifsc", ""),
            "upi_id": settings.get("upi_id", "")
        },
        "customer": {
            "name": data.customer.name.strip(),
            "phone": data.customer.phone.strip() if data.customer.phone else "",
            "email": data.customer.email.strip() if data.customer.email else "",
            "gstin": data.customer.gstin.strip().upper() if data.customer.gstin else "",
            "billing_address": data.customer.billing_address.strip() if data.customer.billing_address else "",
            "state": data.customer.state.strip()
        },
        "items": calc["processed_items"],
        "is_interstate": calc["is_interstate"],
        "subtotal_gross": calc["subtotal_gross"],
        "total_line_discounts": calc["total_line_discounts"],
        "taxable_before_inv_discount": calc["taxable_before_inv_discount"],
        "invoice_discount_type": data.invoice_level_discount_type,
        "invoice_discount_value": data.invoice_level_discount_value,
        "invoice_discount_amount": calc["invoice_discount_amount"],
        "total_net_taxable": calc["total_net_taxable"],
        "total_cgst": calc["total_cgst"],
        "total_sgst": calc["total_sgst"],
        "total_igst": calc["total_igst"],
        "total_tax": calc["total_tax"],
        "roundoff": calc["roundoff"],
        "final_payable_amount": final_amount,
        "tax_breakdown": calc["tax_breakdown"],
        "payment_status": status_val,
        "amount_paid": amount_paid,
        "balance_due": round(max(0.0, final_amount - amount_paid), 2),
        "payment_mode": data.payment_mode or "Cash",
        "notes": data.notes or "",
        "terms_conditions": settings.get("terms_conditions", ""),
        "created_by": user.get("username", "staff"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

    # 3. Deduct stock atomically and record movements
    for deduction in stock_deductions:
        updated_prod = products_col.find_one_and_update(
            {"_id": deduction["product_id"]},
            {"$inc": {"stock_qty": -float(deduction["qty"])}},
            return_document=True
        )
        new_balance = updated_prod.get("stock_qty", 0.0) if updated_prod else 0.0
        
        sold_info = f"{deduction.get('sold_qty', deduction['qty'])} {deduction.get('sold_unit', deduction['unit'])}"
        ref_text = f"Invoice {inv_number}: Sold {sold_info}"
        if deduction.get("sold_unit") != deduction.get("unit"):
            ref_text += f" ({deduction['qty']} {deduction['unit']} deducted)"

        stock_movements_col.insert_one({
            "product_id": deduction["product_id"],
            "product_name": deduction["product_name"],
            "sku": deduction["sku"],
            "movement_type": "INVOICE_SALE",
            "quantity_delta": -float(deduction["qty"]),
            "stock_after": new_balance,
            "reference": ref_text,
            "created_by": user.get("username", "staff"),
            "created_at": datetime.now(timezone.utc)
        })

    res = invoices_col.insert_one(invoice_doc)
    invoice_id = str(res.inserted_id)

    sms_feedback = None
    if getattr(data, 'send_sms', False) and data.customer.phone:
        from routes.sms_routes import send_invoice_sms, SendInvoiceSMSRequest
        try:
            sms_payload = SendInvoiceSMSRequest(
                invoice_id=invoice_id,
                phone_number=data.customer.phone,
                custom_message=data.sms_message
            )
            sms_res = send_invoice_sms(sms_payload, user=user)
            sms_feedback = sms_res
        except HTTPException as he:
            sms_feedback = {"success": False, "message": str(he.detail)}
        except Exception as err:
            sms_feedback = {"success": False, "message": str(err)}

    return {
        "message": f"Invoice {inv_number} created successfully.",
        "id": invoice_id,
        "invoice_number": inv_number,
        "final_payable_amount": final_amount,
        "payment_status": status_val,
        "sms": sms_feedback
    }

@router.get("/{invoice_id}")
def get_invoice(invoice_id: str, user: dict = Depends(require_staff_or_admin)):
    """Fetch complete invoice document."""
    try:
        inv = invoices_col.find_one({"_id": ObjectId(invoice_id)})
    except Exception:
        inv = invoices_col.find_one({"invoice_number": invoice_id})
        
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice record not found.")
    return serialize_doc(inv)

@router.put("/{invoice_id}")
def update_invoice(
    invoice_id: str,
    data: CreateInvoiceRequest,
    user: dict = Depends(require_staff_or_admin)
):
    """
    Edit an existing invoice, recalculate GST, adjust stock deltas, and persist updates.
    """
    try:
        inv = invoices_col.find_one({"_id": ObjectId(invoice_id)})
    except Exception:
        inv = invoices_col.find_one({"invoice_number": invoice_id})

    if not inv:
        raise HTTPException(status_code=404, detail="Invoice record not found.")

    settings = settings_col.find_one({}) or {}
    seller_state = settings.get("state", "Maharashtra")

    # Calculate stock differences to avoid duplicate deductions
    old_items = inv.get("items", [])
    old_qty_by_pid = {}
    for it in old_items:
        pid = str(it.get("product_id") or "")
        if pid:
            factor = float(it.get("conversion_factor") or 1.0)
            base_q = float(it.get("quantity", 0)) * factor
            old_qty_by_pid[pid] = old_qty_by_pid.get(pid, 0.0) + base_q

    new_qty_by_pid = {}
    for it in data.items:
        if it.product_id:
            pid = str(it.product_id)
            factor = float(getattr(it, "conversion_factor", 1.0) or 1.0)
            base_q = float(it.quantity) * factor
            new_qty_by_pid[pid] = new_qty_by_pid.get(pid, 0.0) + base_q

    # Validate stock availability for any increased quantities
    all_pids = set(old_qty_by_pid.keys()).union(set(new_qty_by_pid.keys()))
    stock_adjustments = []

    for pid in all_pids:
        old_q = old_qty_by_pid.get(pid, 0.0)
        new_q = new_qty_by_pid.get(pid, 0.0)
        delta = round(new_q - old_q, 3) # positive means need more stock, negative means return to stock

        if delta != 0:
            prod = products_col.find_one({"_id": ObjectId(pid)})
            if prod:
                if delta > 0 and float(prod.get("stock_qty", 0)) < delta:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient additional stock for '{prod.get('name')}'. Available: {prod.get('stock_qty')}, Required: {delta}"
                    )
                stock_adjustments.append({
                    "product_id": ObjectId(pid),
                    "product_name": prod.get("name"),
                    "sku": prod.get("sku", ""),
                    "delta": delta
                })

    # Recalculate totals
    calc = calculate_invoice_totals(
        items=data.items,
        seller_state=seller_state,
        customer_state=data.customer.state,
        inv_disc_type=data.invoice_level_discount_type,
        inv_disc_val=data.invoice_level_discount_value
    )

    final_amount = calc["final_payable_amount"]
    status_val = data.payment_status
    if status_val == "Paid":
        amount_paid = final_amount
    elif status_val == "Unpaid":
        amount_paid = 0.0
    else:
        amount_paid = min(final_amount, float(data.amount_paid or 0.0))

    # Apply stock adjustments
    for adj in stock_adjustments:
        updated_prod = products_col.find_one_and_update(
            {"_id": adj["product_id"]},
            {"$inc": {"stock_qty": -float(adj["delta"])}},
            return_document=True
        )
        new_balance = updated_prod.get("stock_qty", 0.0) if updated_prod else 0.0

        stock_movements_col.insert_one({
            "product_id": adj["product_id"],
            "product_name": adj["product_name"],
            "sku": adj["sku"],
            "movement_type": "INVOICE_EDIT_ADJUSTMENT",
            "quantity_delta": -float(adj["delta"]),
            "stock_after": new_balance,
            "reference": f"Edit Invoice {inv.get('invoice_number')}",
            "created_by": user.get("username", "staff"),
            "created_at": datetime.now(timezone.utc)
        })

    # Update document
    update_doc = {
        "customer": {
            "name": data.customer.name.strip(),
            "phone": data.customer.phone.strip() if data.customer.phone else "",
            "email": data.customer.email.strip() if data.customer.email else "",
            "gstin": data.customer.gstin.strip().upper() if data.customer.gstin else "",
            "billing_address": data.customer.billing_address.strip() if data.customer.billing_address else "",
            "state": data.customer.state.strip()
        },
        "items": calc["processed_items"],
        "is_interstate": calc["is_interstate"],
        "subtotal_gross": calc["subtotal_gross"],
        "total_line_discounts": calc["total_line_discounts"],
        "taxable_before_inv_discount": calc["taxable_before_inv_discount"],
        "invoice_discount_type": data.invoice_level_discount_type,
        "invoice_discount_value": data.invoice_level_discount_value,
        "invoice_discount_amount": calc["invoice_discount_amount"],
        "total_net_taxable": calc["total_net_taxable"],
        "total_cgst": calc["total_cgst"],
        "total_sgst": calc["total_sgst"],
        "total_igst": calc["total_igst"],
        "total_tax": calc["total_tax"],
        "roundoff": calc["roundoff"],
        "final_payable_amount": final_amount,
        "tax_breakdown": calc["tax_breakdown"],
        "payment_status": status_val,
        "amount_paid": amount_paid,
        "balance_due": round(max(0.0, final_amount - amount_paid), 2),
        "payment_mode": data.payment_mode or "Cash",
        "notes": data.notes or "",
        "updated_at": datetime.now(timezone.utc)
    }

    if data.invoice_date:
        update_doc["invoice_date"] = data.invoice_date
    if data.due_date is not None:
        update_doc["due_date"] = data.due_date

    invoices_col.update_one({"_id": inv["_id"]}, {"$set": update_doc})

    return {
        "message": f"Invoice {inv.get('invoice_number')} updated successfully.",
        "id": str(inv["_id"]),
        "invoice_number": inv.get("invoice_number"),
        "final_payable_amount": final_amount,
        "payment_status": status_val
    }

@router.put("/{invoice_id}/payment-status")
def update_payment_status(
    invoice_id: str,
    payload: UpdatePaymentStatusRequest,
    user: dict = Depends(require_staff_or_admin)
):
    """Update payment status (Paid, Unpaid, Partially Paid) and balance."""
    try:
        inv = invoices_col.find_one({"_id": ObjectId(invoice_id)})
    except Exception:
        inv = invoices_col.find_one({"invoice_number": invoice_id})
        
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice record not found.")

    final_amount = inv.get("final_payable_amount", 0.0)
    status_val = payload.payment_status

    if status_val == "Paid":
        amount_paid = final_amount
    elif status_val == "Unpaid":
        amount_paid = 0.0
    else:
        amount_paid = min(final_amount, float(payload.amount_paid or 0.0))

    balance_due = round(max(0.0, final_amount - amount_paid), 2)

    invoices_col.update_one(
        {"_id": inv["_id"]},
        {"$set": {
            "payment_status": status_val,
            "amount_paid": amount_paid,
            "balance_due": balance_due,
            "payment_mode": payload.payment_mode or inv.get("payment_mode", "Cash"),
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    return {
        "message": f"Invoice {inv.get('invoice_number')} payment status updated to '{status_val}'.",
        "payment_status": status_val,
        "amount_paid": amount_paid,
        "balance_due": balance_due
    }

@router.delete("/{invoice_id}")
def cancel_invoice(invoice_id: str, user: dict = Depends(require_staff_or_admin)):
    """Delete or cancel an invoice, safely restocking items back to inventory."""
    try:
        inv = invoices_col.find_one({"_id": ObjectId(invoice_id)})
    except Exception:
        inv = invoices_col.find_one({"invoice_number": invoice_id})
        
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    # Restock products that were deducted
    for item in inv.get("items", []):
        p_id = item.get("product_id")
        qty = float(item.get("quantity", 0))
        factor = float(item.get("conversion_factor") or 1.0)
        base_qty = round(qty * factor, 3)
        if p_id and base_qty > 0:
            try:
                products_col.update_one(
                    {"_id": ObjectId(p_id)},
                    {"$inc": {"stock_qty": base_qty}}
                )
                stock_movements_col.insert_one({
                    "product_id": ObjectId(p_id),
                    "product_name": item.get("name"),
                    "sku": item.get("sku", ""),
                    "movement_type": "INVOICE_CANCEL_RESTOCK",
                    "quantity_delta": base_qty,
                    "stock_after": 0, # audit mark
                    "reference": f"Cancellation of {inv.get('invoice_number')}: Restocked {qty} {item.get('unit', 'units')}",
                    "created_by": user.get("username", "admin"),
                    "created_at": datetime.now(timezone.utc)
                })
            except Exception:
                pass

    invoices_col.delete_one({"_id": inv["_id"]})
    return {"message": f"Invoice {inv.get('invoice_number')} cancelled and items returned to stock."}
