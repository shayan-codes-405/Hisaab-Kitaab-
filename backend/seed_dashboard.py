"""
HisabKitab Dashboard Seeder
Populates realistic stationery sales, customer orders, and monthly trends across the past 6 months
so the dashboard KPI cards, revenue charts, payment split doughnut, and inventory alerts look rich and authentic.
"""
import sys
from pathlib import Path
from datetime import datetime

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from database import invoices_col, products_col, settings_col, users_col
from routes.invoice_routes import calculate_invoice_totals, InvoiceItemSchema
from auth import hash_password

def seed():
    print("[*] Starting HisabKitab Dashboard Seeder...")

    # Ensure admin user exists
    if users_col.count_documents({}) == 0:
        admin_doc = {
            "username": "admin",
            "password_hash": hash_password("admin123"),
            "full_name": "Shayan Akhtar",
            "role": "admin",
            "created_at": datetime.now()
        }
        users_col.insert_one(admin_doc)
        print("  [+] Created default admin user (admin / admin123)")

    # Ensure business settings exist with Akhtar Enterprises
    settings = settings_col.find_one() or {}
    if not settings:
        settings_update = {
            "business_name": "Akhtar Enterprises",
            "gstin": "27AABCU9603R1ZM",
            "address": "Shop No. 4, Market Complex, Station Road, Mumbai, Maharashtra 400001",
            "phone": "+91 747 093 2909",
            "email": "contact@akhtarenterprises.com",
            "state": "Maharashtra",
            "bank_name": "State Bank of India",
            "bank_account_no": "330012345678",
            "bank_ifsc": "SBIN0001234",
            "upi_id": "7470932909@upi",
            "invoice_prefix": "INV",
            "next_invoice_number": 1,
            "terms_conditions": "1. Goods once sold will not be returned.\n2. Payment due within 15 days of invoice date.",
            "textbee_api_url": "https://api.textbee.dev/api/v1",
            "textbee_api_key": "txb_Vm7G7gBGMX8h0Qgg0kAiNrog050S34kc",
            "textbee_device_id": "6ae2fd84c1ee0a8dec8f5f7d",
            "textbee_demo_mode": False,
            "updated_at": datetime.now()
        }
        settings_col.update_one({}, {"$set": settings_update}, upsert=True)
        settings = settings_col.find_one() or {}
        print("  [+] Initialized business settings for 'Akhtar Enterprises'")

    # Fetch existing products
    products = list(products_col.find())
    if not products:
        print("[!] No products found! Run seed_stationery.py first.")
        return

    prod_by_sku = {p["sku"]: p for p in products}

    # Ensure 2 products trigger low stock threshold for realistic inventory alerts
    if "STAT-STAP-01" in prod_by_sku:
        products_col.update_one(
            {"sku": "STAT-STAP-01"},
            {"$set": {"stock_qty": 3.0, "low_stock_threshold": 5.0}}
        )
        print("  [+] Adjusted STAT-STAP-01 stock to 3 (Threshold: 5) for low-stock alert")

    if "STAT-POST-01" in prod_by_sku:
        products_col.update_one(
            {"sku": "STAT-POST-01"},
            {"$set": {"stock_qty": 4.0, "low_stock_threshold": 10.0}}
        )
        print("  [+] Adjusted STAT-POST-01 stock to 4 (Threshold: 10) for low-stock alert")

    # Fetch business settings for seller snapshot
    settings = settings_col.find_one() or {}
    seller_snapshot = {
        "business_name": settings.get("business_name") or "Akhtar Enterprises",
        "gstin": settings.get("gstin") or "27AABCU9603R1ZM",
        "address": settings.get("address") or "Main Road, Market Complex",
        "phone": settings.get("phone") or "+91 747 093 2909",
        "email": settings.get("email") or "contact@akhtarenterprises.com",
        "state": settings.get("state") or "Maharashtra",
        "bank_name": settings.get("bank_name") or "State Bank of India",
        "bank_account_no": settings.get("bank_account_no") or "330012345678",
        "bank_ifsc": settings.get("bank_ifsc") or "SBIN0001234",
        "upi_id": settings.get("upi_id") or "7470932909@upi"
    }
    seller_state = seller_snapshot["state"]

    # Invoices blueprint over the last 6 months (May to Oct 2026)
    dummy_invoices = [
        # MAY 2026
        {
            "num": "INV-2026-0003",
            "date": "2026-05-14",
            "time": "11:20 am",
            "customer": {
                "name": "Apex Academy & Tutorials",
                "phone": "+91 98230 11223",
                "email": "admin@apexacademy.edu",
                "gstin": "",
                "billing_address": "FC Road, Shivaji Nagar, Pune",
                "state": "Maharashtra"
            },
            "items": [
                {"sku": "STAT-PAPR-01", "qty": 10.0, "disc": 0.0},
                {"sku": "STAT-NOTE-01", "qty": 50.0, "disc": 5.0},
                {"sku": "STAT-PEN-01", "qty": 40.0, "disc": 0.0}
            ],
            "status": "Paid",
            "paid_ratio": 1.0,
            "mode": "Bank Transfer"
        },
        {
            "num": "INV-2026-0004",
            "date": "2026-05-28",
            "time": "03:45 pm",
            "customer": {
                "name": "Sharma Law Associates",
                "phone": "+91 98201 44556",
                "email": "accounts@sharmalaw.in",
                "gstin": "27AAACS1234F1Z8",
                "billing_address": "Fort Chambers, Nariman Point, Mumbai",
                "state": "Maharashtra"
            },
            "items": [
                {"sku": "STAT-PAPR-01", "qty": 8.0, "disc": 0.0},
                {"sku": "STAT-PEN-02", "qty": 20.0, "disc": 0.0},
                {"sku": "STAT-POST-01", "qty": 6.0, "disc": 0.0}
            ],
            "status": "Paid",
            "paid_ratio": 1.0,
            "mode": "UPI"
        },

        # JUNE 2026
        {
            "num": "INV-2026-0005",
            "date": "2026-06-11",
            "time": "10:15 am",
            "customer": {
                "name": "National Book Depot & Xerox",
                "phone": "+91 97654 33210",
                "email": "nbd.mumbai@gmail.com",
                "gstin": "27AABCN8876K1Z2",
                "billing_address": "Dadar West, Mumbai",
                "state": "Maharashtra"
            },
            "items": [
                {"sku": "STAT-PAPR-01", "qty": 15.0, "disc": 5.0},
                {"sku": "STAT-NOTE-01", "qty": 40.0, "disc": 0.0},
                {"sku": "STAT-PEN-01", "qty": 60.0, "disc": 0.0}
            ],
            "status": "Paid",
            "paid_ratio": 1.0,
            "mode": "Cash"
        },
        {
            "num": "INV-2026-0006",
            "date": "2026-06-25",
            "time": "04:30 pm",
            "customer": {
                "name": "Sunrise Public Library",
                "phone": "+91 99221 88776",
                "email": "library@sunrisenashik.org",
                "gstin": "",
                "billing_address": "College Road, Nashik",
                "state": "Maharashtra"
            },
            "items": [
                {"sku": "STAT-STAP-01", "qty": 8.0, "disc": 0.0},
                {"sku": "STAT-GLUE-01", "qty": 12.0, "disc": 0.0},
                {"sku": "STAT-POST-01", "qty": 15.0, "disc": 0.0}
            ],
            "status": "Paid",
            "paid_ratio": 1.0,
            "mode": "UPI"
        },

        # JULY 2026
        {
            "num": "INV-2026-0007",
            "date": "2026-07-08",
            "time": "02:10 pm",
            "customer": {
                "name": "St. Xavier's Convent High School",
                "phone": "+91 94220 55443",
                "email": "bursar@stxaviersngp.org",
                "gstin": "",
                "billing_address": "Civil Lines, Nagpur",
                "state": "Maharashtra"
            },
            "items": [
                {"sku": "STAT-PAPR-01", "qty": 20.0, "disc": 5.0},
                {"sku": "STAT-NOTE-01", "qty": 60.0, "disc": 0.0},
                {"sku": "STAT-PENC-01", "qty": 80.0, "disc": 0.0},
                {"sku": "STAT-ERAS-01", "qty": 80.0, "disc": 0.0}
            ],
            "status": "Paid",
            "paid_ratio": 1.0,
            "mode": "Cheque"
        },
        {
            "num": "INV-2026-0008",
            "date": "2026-07-22",
            "time": "11:50 am",
            "customer": {
                "name": "Pooja Stationery & Gift Gallery",
                "phone": "+91 98920 66778",
                "email": "poojagifts.thane@gmail.com",
                "gstin": "27ABCPP9988D1Z4",
                "billing_address": "Naupada, Thane West",
                "state": "Maharashtra"
            },
            "items": [
                {"sku": "STAT-MARK-01", "qty": 15.0, "disc": 0.0},
                {"sku": "STAT-PEN-02", "qty": 30.0, "disc": 0.0},
                {"sku": "STAT-GLUE-01", "qty": 10.0, "disc": 0.0}
            ],
            "status": "Paid",
            "paid_ratio": 1.0,
            "mode": "Cash"
        },

        # AUGUST 2026
        {
            "num": "INV-2026-0009",
            "date": "2026-08-12",
            "time": "01:40 pm",
            "customer": {
                "name": "Modern Print & Paper Mart",
                "phone": "+91 98250 44332",
                "email": "orders@modernprintsurat.com",
                "gstin": "24AAACM4455G1ZV",
                "billing_address": "Ring Road Textile & Paper Market, Surat",
                "state": "Gujarat"  # Inter-State IGST demo!
            },
            "items": [
                {"sku": "STAT-PAPR-01", "qty": 25.0, "disc": 8.0},
                {"sku": "STAT-STAP-01", "qty": 10.0, "disc": 0.0}
            ],
            "status": "Paid",
            "paid_ratio": 1.0,
            "mode": "Bank Transfer"
        },
        {
            "num": "INV-2026-0010",
            "date": "2026-08-26",
            "time": "05:15 pm",
            "customer": {
                "name": "Apex Academy & Tutorials",
                "phone": "+91 98230 11223",
                "email": "admin@apexacademy.edu",
                "gstin": "",
                "billing_address": "FC Road, Shivaji Nagar, Pune",
                "state": "Maharashtra"
            },
            "items": [
                {"sku": "STAT-NOTE-01", "qty": 50.0, "disc": 0.0},
                {"sku": "STAT-PEN-01", "qty": 50.0, "disc": 0.0}
            ],
            "status": "Partially Paid",
            "paid_ratio": 0.5,
            "mode": "Cash"
        },

        # SEPTEMBER 2026
        {
            "num": "INV-2026-0011",
            "date": "2026-09-09",
            "time": "10:45 am",
            "customer": {
                "name": "TechCorp India Pvt Ltd",
                "phone": "+91 99800 77665",
                "email": "procurement@techcorp.in",
                "gstin": "29AABCT1122E1Z7",
                "billing_address": "Electronic City Phase 1, Bengaluru",
                "state": "Karnataka"  # Inter-State IGST demo!
            },
            "items": [
                {"sku": "STAT-PAPR-01", "qty": 30.0, "disc": 10.0},
                {"sku": "STAT-POST-01", "qty": 25.0, "disc": 0.0},
                {"sku": "STAT-MARK-01", "qty": 20.0, "disc": 0.0}
            ],
            "status": "Paid",
            "paid_ratio": 1.0,
            "mode": "Bank Transfer"
        },
        {
            "num": "INV-2026-0012",
            "date": "2026-09-24",
            "time": "03:20 pm",
            "customer": {
                "name": "National Book Depot & Xerox",
                "phone": "+91 97654 33210",
                "email": "nbd.mumbai@gmail.com",
                "gstin": "27AABCN8876K1Z2",
                "billing_address": "Dadar West, Mumbai",
                "state": "Maharashtra"
            },
            "items": [
                {"sku": "STAT-NOTE-01", "qty": 45.0, "disc": 0.0},
                {"sku": "STAT-PEN-01", "qty": 80.0, "disc": 5.0},
                {"sku": "STAT-ERAS-01", "qty": 50.0, "disc": 0.0}
            ],
            "status": "Partially Paid",
            "paid_ratio": 0.6,
            "mode": "UPI"
        },

        # OCTOBER 2026
        {
            "num": "INV-2026-0013",
            "date": "2026-10-10",
            "time": "11:30 am",
            "customer": {
                "name": "St. Xavier's Convent High School",
                "phone": "+91 94220 55443",
                "email": "bursar@stxaviersngp.org",
                "gstin": "",
                "billing_address": "Civil Lines, Nagpur",
                "state": "Maharashtra"
            },
            "items": [
                {"sku": "STAT-PAPR-01", "qty": 25.0, "disc": 5.0},
                {"sku": "STAT-PENC-01", "qty": 60.0, "disc": 0.0},
                {"sku": "STAT-GLUE-01", "qty": 20.0, "disc": 0.0}
            ],
            "status": "Paid",
            "paid_ratio": 1.0,
            "mode": "Cheque"
        },
        {
            "num": "INV-2026-0014",
            "date": "2026-10-21",
            "time": "02:40 pm",
            "customer": {
                "name": "Sharma Law Associates",
                "phone": "+91 98201 44556",
                "email": "accounts@sharmalaw.in",
                "gstin": "27AAACS1234F1Z8",
                "billing_address": "Fort Chambers, Nariman Point, Mumbai",
                "state": "Maharashtra"
            },
            "items": [
                {"sku": "STAT-PAPR-01", "qty": 12.0, "disc": 0.0},
                {"sku": "STAT-PEN-02", "qty": 25.0, "disc": 5.0},
                {"sku": "STAT-POST-01", "qty": 8.0, "disc": 0.0}
            ],
            "status": "Paid",
            "paid_ratio": 1.0,
            "mode": "UPI"
        },
        {
            "num": "INV-2026-0015",
            "date": "2026-10-28",
            "time": "04:15 pm",
            "customer": {
                "name": "Modern Print & Paper Mart",
                "phone": "+91 98250 44332",
                "email": "orders@modernprintsurat.com",
                "gstin": "24AAACM4455G1ZV",
                "billing_address": "Ring Road Textile & Paper Market, Surat",
                "state": "Gujarat"
            },
            "items": [
                {"sku": "STAT-PAPR-01", "qty": 20.0, "disc": 5.0},
                {"sku": "STAT-STAP-01", "qty": 12.0, "disc": 0.0}
            ],
            "status": "Unpaid",
            "paid_ratio": 0.0,
            "mode": "Pending"
        }
    ]

    inserted_count = 0
    for blueprint in dummy_invoices:
        inv_num = blueprint["num"]
        # Skip if already exists
        if invoices_col.find_one({"invoice_number": inv_num}):
            print(f"  - Invoice {inv_num} already exists, skipping")
            continue

        # Prepare line item schemas
        line_items = []
        for it in blueprint["items"]:
            prod = prod_by_sku.get(it["sku"])
            if not prod:
                continue
            line_items.append(
                InvoiceItemSchema(
                    product_id=str(prod["_id"]),
                    name=prod["name"],
                    sku=prod["sku"],
                    unit=prod.get("unit", "Pcs"),
                    quantity=float(it["qty"]),
                    unit_price=float(prod.get("selling_price", 0.0)),
                    gst_rate=float(prod.get("gst_rate", 18.0)),
                    discount_type="percentage",
                    discount_value=float(it["disc"]),
                    conversion_factor=1.0,
                    base_unit=prod.get("unit", "Pcs")
                )
            )

        # Calculate exact GST and totals
        cust = blueprint["customer"]
        calc_result = calculate_invoice_totals(
            items=line_items,
            seller_state=seller_state,
            customer_state=cust["state"],
            inv_disc_type="percentage",
            inv_disc_val=0.0
        )

        final_amt = calc_result["final_payable_amount"]
        status = blueprint["status"]
        if status == "Paid":
            amt_paid = final_amt
            bal_due = 0.0
        elif status == "Partially Paid":
            amt_paid = round(final_amt * blueprint.get("paid_ratio", 0.5), 2)
            bal_due = round(final_amt - amt_paid, 2)
        else:
            amt_paid = 0.0
            bal_due = final_amt

        invoice_doc = {
            "invoice_number": inv_num,
            "invoice_date": blueprint["date"],
            "invoice_time": blueprint["time"],
            "due_date": "",
            "template": "classic",
            "seller_snapshot": seller_snapshot,
            "customer": cust,
            "items": calc_result["processed_items"],
            "is_interstate": calc_result["is_interstate"],
            "subtotal_gross": calc_result["subtotal_gross"],
            "total_line_discounts": calc_result["total_line_discounts"],
            "taxable_before_inv_discount": calc_result["taxable_before_inv_discount"],
            "invoice_discount_type": "percentage",
            "invoice_discount_value": 0.0,
            "invoice_discount_amount": 0.0,
            "total_net_taxable": calc_result["total_net_taxable"],
            "total_cgst": calc_result["total_cgst"],
            "total_sgst": calc_result["total_sgst"],
            "total_igst": calc_result["total_igst"],
            "total_tax": calc_result["total_tax"],
            "roundoff": calc_result["roundoff"],
            "final_payable_amount": final_amt,
            "tax_breakdown": calc_result["tax_breakdown"],
            "payment_status": status,
            "amount_paid": amt_paid,
            "balance_due": bal_due,
            "payment_mode": blueprint["mode"],
            "notes": "Payment terms: Net 15 days.",
            "terms_conditions": "1. Goods once sold will not be returned.\n2. Payment due within 15 days of invoice date.",
            "created_by": "admin",
            "created_at": datetime.strptime(f"{blueprint['date']} 12:00:00", "%Y-%m-%d %H:%M:%S"),
            "updated_at": datetime.strptime(f"{blueprint['date']} 12:00:00", "%Y-%m-%d %H:%M:%S")
        }

        invoices_col.insert_one(invoice_doc)
        inserted_count += 1
        print(f"  [+] Created {inv_num} ({blueprint['date']}): {cust['name']} | Rs.{final_amt:,.2f} | Status: {status}")

    # Update next_invoice_number in settings so user's next invoice will be INV-2026-0016
    settings_col.update_one(
        {},
        {"$set": {"next_invoice_number": 16}}
    )
    print("  [+] Updated next_invoice_number in settings to 16")

    print(f"\n[OK] Successfully seeded {inserted_count} invoices into MongoDB!")

if __name__ == "__main__":
    seed()
