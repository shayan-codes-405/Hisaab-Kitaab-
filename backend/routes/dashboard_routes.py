from datetime import datetime, timezone, timedelta
from bson import ObjectId
from fastapi import APIRouter, Depends
from typing import Dict, Any

from database import invoices_col, products_col, serialize_doc
from auth import require_staff_or_admin

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard & Analytics"])

@router.get("/metrics")
def get_dashboard_metrics(user: dict = Depends(require_staff_or_admin)):
    """
    Calculate real-time business metrics dynamically from MongoDB records:
    - Sales, invoice volume, paid/unpaid balances.
    - Gross profit calculation based on purchase costs.
    - Inventory threshold status.
    - Monthly revenue trends for Chart.js.
    """
    invoices = list(invoices_col.find({}))
    products = list(products_col.find({}))
    
    # 1. Product & Inventory Metrics
    prod_map = {str(p["_id"]): p for p in products}
    total_products = len(products)
    low_stock_list = []
    out_of_stock_list = []
    
    for p in products:
        stock = p.get("stock_qty", 0)
        threshold = p.get("low_stock_threshold", 5)
        if stock <= 0:
            out_of_stock_list.append(p)
        elif stock <= threshold:
            low_stock_list.append(p)

    # 2. Sales, Balances and Profit Metrics
    total_sales = 0.0
    total_paid = 0.0
    total_unpaid = 0.0
    total_profit = 0.0
    status_counts = {"Paid": 0, "Unpaid": 0, "Partially Paid": 0}
    status_values = {"Paid": 0.0, "Unpaid": 0.0, "Partially Paid": 0.0}

    for inv in invoices:
        final_amt = float(inv.get("final_payable_amount", 0.0))
        amt_paid = float(inv.get("amount_paid", 0.0))
        balance = float(inv.get("balance_due", 0.0))
        st = inv.get("payment_status", "Unpaid")

        total_sales += final_amt
        total_paid += amt_paid
        total_unpaid += balance

        if st in status_counts:
            status_counts[st] += 1
            status_values[st] += final_amt
        else:
            status_counts["Unpaid"] += 1
            status_values["Unpaid"] += final_amt

        # Compute line-item profit based on purchase costs
        for item in inv.get("items", []):
            qty = float(item.get("quantity", 0.0))
            taxable = float(item.get("taxable_amount", 0.0))
            
            p_id = str(item.get("product_id") or "")
            prod_info = prod_map.get(p_id)
            purchase_cost = float(prod_info.get("purchase_price", 0.0)) if prod_info else 0.0
            
            cogs = purchase_cost * qty
            line_profit = taxable - cogs
            total_profit += line_profit

    # 3. Last 6 Months Chart.js Time Series Aggregation
    today = datetime.now()
    month_buckets = {}
    
    # Pre-populate last 6 calendar months
    for i in range(5, -1, -1):
        # Calculate year and month
        y = today.year
        m = today.month - i
        while m <= 0:
            m += 12
            y -= 1
        key = f"{y}-{str(m).zfill(2)}"
        month_label = datetime(y, m, 1).strftime("%b %Y")
        month_buckets[key] = {
            "key": key,
            "label": month_label,
            "sales": 0.0,
            "invoices": 0
        }

    for inv in invoices:
        date_str = inv.get("invoice_date", "")
        if date_str and len(date_str) >= 7:
            key = date_str[:7]
            if key in month_buckets:
                month_buckets[key]["sales"] += float(inv.get("final_payable_amount", 0.0))
                month_buckets[key]["invoices"] += 1

    chart_labels = [b["label"] for b in month_buckets.values()]
    chart_sales_data = [round(b["sales"], 2) for b in month_buckets.values()]
    chart_inv_data = [b["invoices"] for b in month_buckets.values()]

    # 4. Recent Invoices
    recent = list(invoices_col.find({}).sort("created_at", -1).limit(6))

    return {
        "kpi": {
            "total_sales": round(total_sales, 2),
            "total_invoices": len(invoices),
            "total_paid": round(total_paid, 2),
            "total_unpaid": round(total_unpaid, 2),
            "estimated_profit": round(total_profit, 2),
            "total_products": total_products,
            "low_stock_count": len(low_stock_list),
            "out_of_stock_count": len(out_of_stock_list)
        },
        "charts": {
            "monthly_sales": {
                "labels": chart_labels,
                "sales": chart_sales_data,
                "invoices": chart_inv_data
            },
            "payment_distribution": {
                "labels": ["Paid", "Unpaid", "Partially Paid"],
                "counts": [status_counts["Paid"], status_counts["Unpaid"], status_counts["Partially Paid"]],
                "values": [round(status_values["Paid"], 2), round(status_values["Unpaid"], 2), round(status_values["Partially Paid"], 2)]
            }
        },
        "low_stock_alerts": serialize_doc(low_stock_list[:5] + out_of_stock_list[:5]),
        "recent_invoices": serialize_doc(recent)
    }
