from datetime import datetime, timezone, timedelta
from bson import ObjectId
from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, Optional, List

from database import invoices_col, products_col, users_col, serialize_doc, get_business_for_user
from auth import require_staff_or_admin

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard & Analytics"])

@router.get("/metrics")
def get_dashboard_metrics(
    date_range: str = Query("6months", alias="range", description="today, this_week, this_month, 6months, all, custom"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    staff: Optional[str] = Query(None),
    user: dict = Depends(require_staff_or_admin)
):
    """
    Calculate real-time business metrics dynamically from MongoDB records:
    - Filtered by dynamic date range (Today, This Week, This Month, Last 6 Months, All Time, Custom).
    - Sales, invoice volume, paid/unpaid balances.
    - Gross profit calculation based on purchase costs.
    - Product Inventory threshold status.
    - Revenue trends for Chart.js.
    - Staff sales attribution & product performance breakdown.
    """
    all_invoices = list(invoices_col.find({}))
    products = list(products_col.find({}))

    # 1. Product & Inventory Metrics (Global)
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

    # 2. Date Range Boundaries
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")

    start_bound = None
    end_bound = None

    if date_range == "today":
        start_bound = today_str
        end_bound = today_str
    elif date_range == "this_week":
        # Monday of current week
        start_of_week = now - timedelta(days=now.weekday())
        start_bound = start_of_week.strftime("%Y-%m-%d")
        end_bound = today_str
    elif date_range == "this_month":
        start_of_month = datetime(now.year, now.month, 1)
        start_bound = start_of_month.strftime("%Y-%m-%d")
        end_bound = today_str
    elif date_range == "6months":
        # 5 months ago first day
        y = now.year
        m = now.month - 5
        while m <= 0:
            m += 12
            y -= 1
        start_bound = datetime(y, m, 1).strftime("%Y-%m-%d")
        end_bound = today_str
    elif date_range == "custom" and start_date and end_date:
        start_bound = start_date
        end_bound = end_date
    # "all" leaves start_bound and end_bound as None

    # Filter invoices
    filtered_invoices = []
    for inv in all_invoices:
        inv_d = inv.get("invoice_date")
        if not inv_d and inv.get("created_at"):
            try:
                inv_d = inv["created_at"].strftime("%Y-%m-%d")
            except Exception:
                inv_d = str(inv["created_at"])[:10]
        if not inv_d:
            inv_d = today_str

        # Apply bounds
        if start_bound and inv_d < start_bound:
            continue
        if end_bound and inv_d > end_bound:
            continue

        # Apply staff filter if requested
        if staff and staff != "all":
            inv_staff_user = inv.get("created_by") or ""
            inv_staff_name = inv.get("staff_name") or ""
            if staff not in (inv_staff_user, inv_staff_name):
                continue

        filtered_invoices.append(inv)

    # 3. Dynamic KPI Calculations
    total_sales = 0.0
    total_paid = 0.0
    total_unpaid = 0.0
    total_profit = 0.0
    status_counts = {"Paid": 0, "Unpaid": 0, "Partially Paid": 0}
    status_values = {"Paid": 0.0, "Unpaid": 0.0, "Partially Paid": 0.0}

    for inv in filtered_invoices:
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

        # Compute line-item profit based on purchase cost
        for item in inv.get("items", []):
            qty = float(item.get("quantity", 0.0))
            taxable = float(item.get("taxable_amount", 0.0))

            p_id = str(item.get("product_id") or "")
            prod_info = prod_map.get(p_id)
            purchase_cost = float(prod_info.get("purchase_price", 0.0)) if prod_info else 0.0

            cogs = purchase_cost * qty
            line_profit = taxable - cogs
            total_profit += line_profit

    # 4. Dynamic Time Series Chart Data Based on Selected Range
    chart_labels = []
    chart_sales_data = []
    chart_inv_data = []

    if date_range == "today":
        # Hourly breakdown
        time_buckets = {
            "08:00 - 12:00 (Morning)": {"sales": 0.0, "invoices": 0},
            "12:00 - 16:00 (Afternoon)": {"sales": 0.0, "invoices": 0},
            "16:00 - 20:00 (Evening)": {"sales": 0.0, "invoices": 0},
            "20:00+ (Night)": {"sales": 0.0, "invoices": 0}
        }
        for inv in filtered_invoices:
            amt = float(inv.get("final_payable_amount", 0.0))
            inv_t = inv.get("invoice_time") or "12:00"
            hour = 12
            try:
                hour = int(inv_t.split(":")[0])
            except Exception:
                pass
            if hour < 12:
                b_name = "08:00 - 12:00 (Morning)"
            elif hour < 16:
                b_name = "12:00 - 16:00 (Afternoon)"
            elif hour < 20:
                b_name = "16:00 - 20:00 (Evening)"
            else:
                b_name = "20:00+ (Night)"
            time_buckets[b_name]["sales"] += amt
            time_buckets[b_name]["invoices"] += 1

        chart_labels = list(time_buckets.keys())
        chart_sales_data = [round(b["sales"], 2) for b in time_buckets.values()]
        chart_inv_data = [b["invoices"] for b in time_buckets.values()]

    elif date_range == "this_week":
        # Day of week breakdown (Monday - Sunday)
        start_of_week = now - timedelta(days=now.weekday())
        week_buckets = {}
        for i in range(7):
            d = start_of_week + timedelta(days=i)
            key = d.strftime("%Y-%m-%d")
            label = d.strftime("%a (%d %b)")
            week_buckets[key] = {"label": label, "sales": 0.0, "invoices": 0}

        for inv in filtered_invoices:
            inv_d = inv.get("invoice_date") or str(inv.get("created_at", ""))[:10]
            if inv_d in week_buckets:
                week_buckets[inv_d]["sales"] += float(inv.get("final_payable_amount", 0.0))
                week_buckets[inv_d]["invoices"] += 1

        chart_labels = [b["label"] for b in week_buckets.values()]
        chart_sales_data = [round(b["sales"], 2) for b in week_buckets.values()]
        chart_inv_data = [b["invoices"] for b in week_buckets.values()]

    elif date_range == "this_month":
        # 4-week breakdown of current month
        month_name = now.strftime("%b")
        month_buckets = {
            f"1 - 7 {month_name}": {"sales": 0.0, "invoices": 0},
            f"8 - 14 {month_name}": {"sales": 0.0, "invoices": 0},
            f"15 - 21 {month_name}": {"sales": 0.0, "invoices": 0},
            f"22+ {month_name}": {"sales": 0.0, "invoices": 0}
        }
        for inv in filtered_invoices:
            inv_d = inv.get("invoice_date") or str(inv.get("created_at", ""))[:10]
            day = 1
            try:
                day = int(inv_d.split("-")[2])
            except Exception:
                pass
            amt = float(inv.get("final_payable_amount", 0.0))
            if day <= 7:
                b = f"1 - 7 {month_name}"
            elif day <= 14:
                b = f"8 - 14 {month_name}"
            elif day <= 21:
                b = f"15 - 21 {month_name}"
            else:
                b = f"22+ {month_name}"
            month_buckets[b]["sales"] += amt
            month_buckets[b]["invoices"] += 1

        chart_labels = list(month_buckets.keys())
        chart_sales_data = [round(b["sales"], 2) for b in month_buckets.values()]
        chart_inv_data = [b["invoices"] for b in month_buckets.values()]

    else:
        # 6 Months or All Time (Month by month)
        month_buckets = {}
        for i in range(5, -1, -1):
            y = now.year
            m = now.month - i
            while m <= 0:
                m += 12
                y -= 1
            key = f"{y}-{str(m).zfill(2)}"
            label = datetime(y, m, 1).strftime("%b %Y")
            month_buckets[key] = {"label": label, "sales": 0.0, "invoices": 0}

        for inv in filtered_invoices:
            inv_d = inv.get("invoice_date") or str(inv.get("created_at", ""))[:10]
            if inv_d and len(inv_d) >= 7:
                k = inv_d[:7]
                if k in month_buckets:
                    month_buckets[k]["sales"] += float(inv.get("final_payable_amount", 0.0))
                    month_buckets[k]["invoices"] += 1

        chart_labels = [b["label"] for b in month_buckets.values()]
        chart_sales_data = [round(b["sales"], 2) for b in month_buckets.values()]
        chart_inv_data = [b["invoices"] for b in month_buckets.values()]

    # 5. Staff Sales & Product Performance Breakdown
    staff_map = {}
    for inv in filtered_invoices:
        st_user = inv.get("created_by") or "admin"
        st_name = inv.get("staff_name") or ("Administrator" if st_user == "admin" else st_user)
        st_role = inv.get("staff_role") or ("admin" if st_user == "admin" else "staff")

        if st_user not in staff_map:
            staff_map[st_user] = {
                "username": st_user,
                "name": st_name,
                "role": st_role,
                "invoice_count": 0,
                "total_sales": 0.0,
                "total_items_sold": 0,
                "products": {} # prod_name -> { qty, revenue }
            }

        final_amt = float(inv.get("final_payable_amount", 0.0))
        staff_map[st_user]["invoice_count"] += 1
        staff_map[st_user]["total_sales"] += final_amt

        for it in inv.get("items", []):
            p_name = it.get("name") or it.get("product_name") or "Product"
            qty = float(it.get("quantity", 0.0))
            line_tot = float(it.get("total") or it.get("taxable_amount") or 0.0)

            staff_map[st_user]["total_items_sold"] += int(qty)
            if p_name not in staff_map[st_user]["products"]:
                staff_map[st_user]["products"][p_name] = {"qty": 0.0, "revenue": 0.0}
            staff_map[st_user]["products"][p_name]["qty"] += qty
            staff_map[st_user]["products"][p_name]["revenue"] += line_tot

    staff_performance = []
    for st in staff_map.values():
        sorted_prods = sorted(
            st["products"].items(),
            key=lambda x: x[1]["qty"],
            reverse=True
        )
        top_prods = [
            {
                "product_name": p[0],
                "quantity": p[1]["qty"],
                "revenue": round(p[1]["revenue"], 2)
            }
            for p in sorted_prods[:4]
        ]
        staff_performance.append({
            "username": st["username"],
            "name": st["name"],
            "role": st["role"],
            "invoice_count": st["invoice_count"],
            "total_sales": round(st["total_sales"], 2),
            "total_items_sold": st["total_items_sold"],
            "top_products": top_prods
        })

    # Sort staff by revenue descending
    staff_performance.sort(key=lambda x: x["total_sales"], reverse=True)

    # 6. Recent Invoices in this filtered range
    recent = sorted(filtered_invoices, key=lambda x: str(x.get("created_at", "")), reverse=True)[:6]

    return {
        "range": date_range,
        "date_bounds": {
            "start": start_bound,
            "end": end_bound
        },
        "kpi": {
            "total_sales": round(total_sales, 2),
            "total_invoices": len(filtered_invoices),
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
                "values": [
                    round(status_values["Paid"], 2),
                    round(status_values["Unpaid"], 2),
                    round(status_values["Partially Paid"], 2)
                ]
            }
        },
        "staff_performance": staff_performance,
        "low_stock_alerts": serialize_doc(low_stock_list[:5] + out_of_stock_list[:5]),
        "recent_invoices": serialize_doc(recent)
    }
