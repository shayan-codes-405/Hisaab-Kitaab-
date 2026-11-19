import sys
import os
from datetime import datetime, timezone
from bson import ObjectId

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import products_col, invoices_col, stock_inwards_col, stock_movements_col, settings_col, users_col

def run_seed():
    pharmacy_id = "6afc9daf96d53b52b175f437"
    pharmacy_biz = settings_col.find_one({"_id": ObjectId(pharmacy_id)})
    if not pharmacy_biz:
        print("Pharmacy business not found!")
        return

    biller = users_col.find_one({"username": "staffp01"})
    stockist = users_col.find_one({"username": "staffp02"})

    if not biller or not stockist:
        print("Biller or stockist user not found!")
        return

    biller_id_str = str(biller["_id"])
    stockist_id_str = str(stockist["_id"])

    print(f"Seeding for {pharmacy_biz.get('business_name')} (ID: {pharmacy_id})")
    print(f"Biller: {biller.get('full_name')} ({biller.get('username')})")
    print(f"Stockist: {stockist.get('full_name')} ({stockist.get('username')})")

    # 1. Pharmacy Products
    pharmacy_products = [
        {
            "name": "Azithromycin 500mg Tablets (Box of 30)",
            "sku": "MED-AZITH-500",
            "category": "Pharmacy",
            "unit": "Box",
            "purchase_price": 120.0,
            "selling_price": 185.0,
            "stock_qty": 85.0,
            "low_stock_threshold": 15.0,
            "gst_rate": 12.0,
            "package_unit": "Strip",
            "package_qty": 3.0,
            "package_selling_price": 65.0,
            "industry_sector": "pharmacy",
            "sector_fields": {
                "batch_number": "AZ-8812",
                "expiry_date": "2028-06-30",
                "drug_composition": "Azithromycin IP 500mg",
                "drug_schedule": "Schedule H"
            },
            "custom_attributes": {},
            "batch_number": "AZ-8812",
            "expiry_date": "2028-06-30",
            "part_number": "",
            "description": "Broad-spectrum macrolide antibiotic."
        },
        {
            "name": "Dettol Antiseptic Liquid (500ml Bottle)",
            "sku": "MED-DETT-500",
            "category": "Healthcare",
            "unit": "Bottle",
            "purchase_price": 155.0,
            "selling_price": 215.0,
            "stock_qty": 45.0,
            "low_stock_threshold": 10.0,
            "gst_rate": 18.0,
            "package_unit": "",
            "package_qty": 1.0,
            "package_selling_price": 0.0,
            "industry_sector": "pharmacy",
            "sector_fields": {
                "batch_number": "DET-2026A",
                "expiry_date": "2029-01-31",
                "drug_composition": "Chloroxylenol 4.8% w/v",
                "drug_schedule": "OTC"
            },
            "custom_attributes": {},
            "batch_number": "DET-2026A",
            "expiry_date": "2029-01-31",
            "part_number": "",
            "description": "Household first-aid antiseptic disinfectant."
        },
        {
            "name": "Accu-Chek Active Glucose Test Strips (50 Strips)",
            "sku": "MED-ACCU-50",
            "category": "Diagnostics",
            "unit": "Pack",
            "purchase_price": 680.0,
            "selling_price": 940.0,
            "stock_qty": 35.0,
            "low_stock_threshold": 8.0,
            "gst_rate": 12.0,
            "package_unit": "",
            "package_qty": 1.0,
            "package_selling_price": 0.0,
            "industry_sector": "pharmacy",
            "sector_fields": {
                "batch_number": "AC-99321",
                "expiry_date": "2027-12-31",
                "drug_composition": "Glucose Dehydrogenase biosensor",
                "drug_schedule": "Medical Device"
            },
            "custom_attributes": {},
            "batch_number": "AC-99321",
            "expiry_date": "2027-12-31",
            "part_number": "",
            "description": "Blood glucose monitoring strips."
        },
        {
            "name": "Omee 20mg Capsules (Box of 100)",
            "sku": "MED-OMEP-20",
            "category": "Pharmacy",
            "unit": "Box",
            "purchase_price": 140.0,
            "selling_price": 220.0,
            "stock_qty": 90.0,
            "low_stock_threshold": 20.0,
            "gst_rate": 12.0,
            "package_unit": "Strip",
            "package_qty": 10.0,
            "package_selling_price": 25.0,
            "industry_sector": "pharmacy",
            "sector_fields": {
                "batch_number": "OM-5510",
                "expiry_date": "2028-09-30",
                "drug_composition": "Omeprazole IP 20mg",
                "drug_schedule": "Schedule H"
            },
            "custom_attributes": {},
            "batch_number": "OM-5510",
            "expiry_date": "2028-09-30",
            "part_number": "",
            "description": "Proton pump inhibitor for acidity and reflux."
        },
        {
            "name": "Dr. Morepen Digital Clinical Thermometer",
            "sku": "MED-THERM-DIG",
            "category": "Diagnostics",
            "unit": "Piece",
            "purchase_price": 125.0,
            "selling_price": 210.0,
            "stock_qty": 28.0,
            "low_stock_threshold": 5.0,
            "gst_rate": 18.0,
            "package_unit": "",
            "package_qty": 1.0,
            "package_selling_price": 0.0,
            "industry_sector": "pharmacy",
            "sector_fields": {
                "batch_number": "TH-2026-X",
                "expiry_date": "2032-12-31",
                "drug_composition": "Digital temperature sensor",
                "drug_schedule": "Medical Device"
            },
            "custom_attributes": {},
            "batch_number": "TH-2026-X",
            "expiry_date": "2032-12-31",
            "part_number": "",
            "description": "Rapid digital body temperature measurement."
        },
        {
            "name": "Electral ORS Powder Sachets (Box of 25)",
            "sku": "MED-ELEC-ORS",
            "category": "Healthcare",
            "unit": "Box",
            "purchase_price": 320.0,
            "selling_price": 475.0,
            "stock_qty": 60.0,
            "low_stock_threshold": 12.0,
            "gst_rate": 12.0,
            "package_unit": "Sachet",
            "package_qty": 25.0,
            "package_selling_price": 21.0,
            "industry_sector": "pharmacy",
            "sector_fields": {
                "batch_number": "ORS-1192",
                "expiry_date": "2028-04-30",
                "drug_composition": "Oral Rehydration Salts WHO Formula",
                "drug_schedule": "OTC"
            },
            "custom_attributes": {},
            "batch_number": "ORS-1192",
            "expiry_date": "2028-04-30",
            "part_number": "",
            "description": "Electrolyte and fluid replenishment formulation."
        },
        {
            "name": "N95 Certified 5-Layer Face Masks (Pack of 20)",
            "sku": "MED-MASK-N95",
            "category": "Healthcare",
            "unit": "Pack",
            "purchase_price": 190.0,
            "selling_price": 320.0,
            "stock_qty": 75.0,
            "low_stock_threshold": 15.0,
            "gst_rate": 12.0,
            "package_unit": "Piece",
            "package_qty": 20.0,
            "package_selling_price": 18.0,
            "industry_sector": "pharmacy",
            "sector_fields": {
                "batch_number": "N95-2026",
                "expiry_date": "2031-10-31",
                "drug_composition": "Meltblown non-woven polypropylene",
                "drug_schedule": "Personal Protective Equipment"
            },
            "custom_attributes": {},
            "batch_number": "N95-2026",
            "expiry_date": "2031-10-31",
            "part_number": "",
            "description": "High-efficiency bacterial filtration respiratory mask."
        },
        {
            "name": "Betadine 10% Antiseptic Solution (100ml)",
            "sku": "MED-BETAD-100",
            "category": "Pharmacy",
            "unit": "Bottle",
            "purchase_price": 92.0,
            "selling_price": 138.0,
            "stock_qty": 40.0,
            "low_stock_threshold": 10.0,
            "gst_rate": 12.0,
            "package_unit": "",
            "package_qty": 1.0,
            "package_selling_price": 0.0,
            "industry_sector": "pharmacy",
            "sector_fields": {
                "batch_number": "BET-7721",
                "expiry_date": "2028-02-28",
                "drug_composition": "Povidone Iodine IP 10% w/v",
                "drug_schedule": "Antiseptic"
            },
            "custom_attributes": {},
            "batch_number": "BET-7721",
            "expiry_date": "2028-02-28",
            "part_number": "",
            "description": "Antiseptic microbicide for skin and wound disinfection."
        },
        {
            "name": "Pan-D Gastro-Resistant Capsules (Strip of 15)",
            "sku": "MED-PAN-D",
            "category": "Pharmacy",
            "unit": "Strip",
            "purchase_price": 115.0,
            "selling_price": 180.0,
            "stock_qty": 110.0,
            "low_stock_threshold": 25.0,
            "gst_rate": 12.0,
            "package_unit": "",
            "package_qty": 1.0,
            "package_selling_price": 0.0,
            "industry_sector": "pharmacy",
            "sector_fields": {
                "batch_number": "PAND-9441",
                "expiry_date": "2028-11-30",
                "drug_composition": "Pantoprazole 40mg + Domperidone 30mg",
                "drug_schedule": "Schedule H"
            },
            "custom_attributes": {},
            "batch_number": "PAND-9441",
            "expiry_date": "2028-11-30",
            "part_number": "",
            "description": "Anti-reflux gastroprokinetic combination."
        }
    ]

    saved_products = []
    # Fetch existing Dolo product
    dolo = products_col.find_one({"sku": "MED-DOLO-650", "business_id": pharmacy_id})
    if dolo:
        saved_products.append(dolo)

    for p in pharmacy_products:
        p["business_id"] = pharmacy_id
        p["created_at"] = datetime(2026, 6, 1, 10, 0, tzinfo=timezone.utc)
        p["updated_at"] = datetime(2026, 6, 1, 10, 0, tzinfo=timezone.utc)
        # Upsert by sku & business_id
        res = products_col.update_one(
            {"sku": p["sku"], "business_id": pharmacy_id},
            {"$set": p},
            upsert=True
        )
        saved = products_col.find_one({"sku": p["sku"], "business_id": pharmacy_id})
        saved_products.append(saved)

    print(f"Products ready: {len(saved_products)} pharmacy products.")

    # 2. Stock Inward Batches by Stockist Ravi Kumar
    stock_inwards_col.delete_many({"business_id": pharmacy_id})
    inward_records = [
        {
            "product_id": saved_products[0]["_id"],
            "product_name": saved_products[0]["name"],
            "sku": saved_products[0]["sku"],
            "quantity_received": 150.0,
            "stock_after": 150.0,
            "supplier_name": "Cipla Distribution Hub",
            "supplier_bill_no": "CIP-WB-2026-902",
            "supplier_bill_date": "2026-06-05",
            "received_by_id": stockist_id_str,
            "received_by_name": stockist.get("full_name", "Ravi Kumar"),
            "received_by_role": "inventory_manager",
            "authorization_type": "NORMAL",
            "emergency_declaration": "",
            "status": "VERIFIED",
            "business_id": pharmacy_id,
            "created_at": datetime(2026, 6, 5, 11, 30, tzinfo=timezone.utc),
            "audited_at": datetime(2026, 6, 5, 12, 0, tzinfo=timezone.utc),
            "audited_by": "admin",
            "audited_by_name": "Shayan Akhtar",
            "audit_notes": "All medicine batch codes and expiry dates verified against supplier invoice."
        },
        {
            "product_id": saved_products[1]["_id"],
            "product_name": saved_products[1]["name"],
            "sku": saved_products[1]["sku"],
            "quantity_received": 100.0,
            "stock_after": 85.0,
            "supplier_name": "Sun Pharma Eastern Depot",
            "supplier_bill_no": "SUN-KOL-8841",
            "supplier_bill_date": "2026-06-15",
            "received_by_id": stockist_id_str,
            "received_by_name": stockist.get("full_name", "Ravi Kumar"),
            "received_by_role": "inventory_manager",
            "authorization_type": "NORMAL",
            "emergency_declaration": "",
            "status": "VERIFIED",
            "business_id": pharmacy_id,
            "created_at": datetime(2026, 6, 15, 14, 0, tzinfo=timezone.utc),
            "audited_at": datetime(2026, 6, 15, 14, 30, tzinfo=timezone.utc),
            "audited_by": "admin",
            "audited_by_name": "Shayan Akhtar",
            "audit_notes": "Cold chain packaging intact. Expiry date validated."
        },
        {
            "product_id": saved_products[3]["_id"],
            "product_name": saved_products[3]["name"],
            "sku": saved_products[3]["sku"],
            "quantity_received": 50.0,
            "stock_after": 35.0,
            "supplier_name": "Roche Diagnostics India",
            "supplier_bill_no": "ROC-INV-1029",
            "supplier_bill_date": "2026-07-10",
            "received_by_id": stockist_id_str,
            "received_by_name": stockist.get("full_name", "Ravi Kumar"),
            "received_by_role": "inventory_manager",
            "authorization_type": "NORMAL",
            "emergency_declaration": "",
            "status": "VERIFIED",
            "business_id": pharmacy_id,
            "created_at": datetime(2026, 7, 10, 16, 20, tzinfo=timezone.utc),
            "audited_at": datetime(2026, 7, 10, 16, 50, tzinfo=timezone.utc),
            "audited_by": "admin",
            "audited_by_name": "Shayan Akhtar",
            "audit_notes": "Diagnostic strips seal inspected and accepted."
        }
    ]
    stock_inwards_col.insert_many(inward_records)
    print("Stock inward entries seeded.")

    # 3. Seller Snapshot
    seller_snapshot = {
        "business_name": pharmacy_biz.get("business_name", "Akhtar Pharmacy & Healthcare"),
        "gstin": pharmacy_biz.get("gstin", "27AAAAA0000A1Z5"),
        "address": pharmacy_biz.get("address", "Shop #5, Medical Enclave, Kolkata, West Bengal"),
        "phone": pharmacy_biz.get("phone", "+91 95474 52432"),
        "email": pharmacy_biz.get("email", "contact@akhtarpharmacy.com"),
        "state": pharmacy_biz.get("state", "West Bengal"),
        "bank_name": "State Bank of India",
        "bank_account_no": "330012345678",
        "bank_ifsc": "SBIN0001234",
        "upi_id": "9547452432@upi"
    }

    # 4. Realistic Invoices (Retail B2C + Wholesale B2B)
    # Remove previous pharmacy invoices if any
    invoices_col.delete_many({"business_id": pharmacy_id})

    # Find product helpers
    prod_by_sku = {p["sku"]: p for p in saved_products}

    def make_item(sku, qty, custom_price=None):
        p = prod_by_sku[sku]
        unit_price = custom_price if custom_price is not None else p["selling_price"]
        gross = unit_price * qty
        gst_rate = p.get("gst_rate", 12.0)
        # Intra-state calculation (CGST + SGST)
        taxable = gross
        cgst = round((taxable * (gst_rate / 2.0)) / 100.0, 2)
        sgst = round((taxable * (gst_rate / 2.0)) / 100.0, 2)
        total_tax = cgst + sgst
        line_total = taxable + total_tax
        return {
            "product_id": str(p["_id"]),
            "name": p["name"],
            "sku": p["sku"],
            "unit": p.get("unit", "Unit"),
            "quantity": float(qty),
            "unit_price": float(unit_price),
            "gross_amount": float(gross),
            "discount_type": "percentage",
            "discount_value": 0.0,
            "line_discount": 0.0,
            "taxable_amount": float(taxable),
            "gst_rate": float(gst_rate),
            "conversion_factor": 1.0,
            "base_unit": p.get("unit", "Unit"),
            "batch_number": p.get("batch_number", ""),
            "expiry_date": p.get("expiry_date", ""),
            "part_number": "",
            "net_taxable": float(taxable),
            "cgst_amount": float(cgst),
            "sgst_amount": float(sgst),
            "igst_amount": 0.0,
            "total_tax": float(total_tax),
            "line_total": float(line_total)
        }

    invoice_blueprints = [
        # June 2026: Wholesale Order to Clinic
        {
            "inv_no": "INV-2026-PH01",
            "date": "2026-06-18",
            "time": "11:15 am",
            "customer": {
                "name": "Medanta Daycare & Diagnostics",
                "phone": "+91 98301 22910",
                "email": "procurement@medantadaycare.in",
                "gstin": "19AACCM5501Z1V",
                "billing_address": "Sector V, Salt Lake, Kolkata",
                "state": "West Bengal"
            },
            "items_spec": [
                ("MED-AZITH-500", 15, 175.0),
                ("MED-DETT-500", 10, 200.0),
                ("MED-MASK-N95", 12, 300.0),
                ("MED-OMEP-20", 8, 210.0)
            ],
            "status": "Paid",
            "mode": "Bank Transfer",
            "is_wholesale": True
        },
        # June 2026: Retail Walk-in OTC
        {
            "inv_no": "INV-2026-PH02",
            "date": "2026-06-26",
            "time": "04:45 pm",
            "customer": {
                "name": "Debashis Roy",
                "phone": "+91 98310 99812",
                "email": "debashis.roy@gmail.com",
                "gstin": "",
                "billing_address": "Rashbehari Avenue, Kolkata",
                "state": "West Bengal"
            },
            "items_spec": [
                ("MED-DOLO-650", 4, 34.0),
                ("MED-PAN-D", 2, 180.0),
                ("MED-ELEC-ORS", 1, 475.0)
            ],
            "status": "Paid",
            "mode": "UPI",
            "is_wholesale": False
        },
        # July 2026: Wholesale Order to Nursing Home
        {
            "inv_no": "INV-2026-PH03",
            "date": "2026-07-08",
            "time": "02:30 pm",
            "customer": {
                "name": "LifeCare PolyClinic & Nursing",
                "phone": "+91 98360 44102",
                "email": "supplies@lifecarenursing.org",
                "gstin": "19AABCL2201R1Z8",
                "billing_address": "Gariahat Road, Kolkata",
                "state": "West Bengal"
            },
            "items_spec": [
                ("MED-ACCU-50", 8, 900.0),
                ("MED-THERM-DIG", 6, 200.0),
                ("MED-BETAD-100", 15, 130.0),
                ("MED-DETT-500", 12, 205.0)
            ],
            "status": "Paid",
            "mode": "Bank Transfer",
            "is_wholesale": True
        },
        # July 2026: Retail Walk-in OTC
        {
            "inv_no": "INV-2026-PH04",
            "date": "2026-07-22",
            "time": "06:10 pm",
            "customer": {
                "name": "Pooja Mukherjee",
                "phone": "+91 98322 77103",
                "email": "",
                "gstin": "",
                "billing_address": "New Town Action Area 1, Kolkata",
                "state": "West Bengal"
            },
            "items_spec": [
                ("MED-DOLO-650", 3, 34.0),
                ("MED-AZITH-500", 1, 185.0),
                ("MED-MASK-N95", 1, 320.0)
            ],
            "status": "Paid",
            "mode": "UPI",
            "is_wholesale": False
        },
        # August 2026: Institutional Bulk Supply
        {
            "inv_no": "INV-2026-PH05",
            "date": "2026-08-14",
            "time": "01:20 pm",
            "customer": {
                "name": "Apollo FirstMed PolyClinic",
                "phone": "+91 98319 88310",
                "email": "accounts@apollofirstmed.in",
                "gstin": "19AAPFA7710B1ZT",
                "billing_address": "EM Bypass, Kolkata",
                "state": "West Bengal"
            },
            "items_spec": [
                ("MED-ACCU-50", 10, 890.0),
                ("MED-AZITH-500", 20, 170.0),
                ("MED-PAN-D", 25, 165.0),
                ("MED-MASK-N95", 15, 290.0)
            ],
            "status": "Paid",
            "mode": "Bank Transfer",
            "is_wholesale": True
        },
        # August 2026: Retail Walk-in
        {
            "inv_no": "INV-2026-PH06",
            "date": "2026-08-28",
            "time": "07:35 pm",
            "customer": {
                "name": "Sunil Verma",
                "phone": "+91 98305 66120",
                "email": "sunil.verma@outlook.com",
                "gstin": "",
                "billing_address": "Behala Chowrasta, Kolkata",
                "state": "West Bengal"
            },
            "items_spec": [
                ("MED-THERM-DIG", 1, 210.0),
                ("MED-ELEC-ORS", 2, 475.0),
                ("MED-DETT-500", 1, 215.0)
            ],
            "status": "Paid",
            "mode": "Cash",
            "is_wholesale": False
        },
        # October 2026: Wholesale Order (Partially Paid)
        {
            "inv_no": "INV-2026-PH07",
            "date": "2026-10-18",
            "time": "12:40 pm",
            "customer": {
                "name": "Woodlands Health Diagnostics",
                "phone": "+91 98311 00293",
                "email": "purchase@woodlandshealth.in",
                "gstin": "19AAACW1120Q1ZX",
                "billing_address": "Alipore Road, Kolkata",
                "state": "West Bengal"
            },
            "items_spec": [
                ("MED-ACCU-50", 12, 880.0),
                ("MED-OMEP-20", 15, 205.0),
                ("MED-PAN-D", 20, 165.0),
                ("MED-BETAD-100", 10, 130.0)
            ],
            "status": "Partially Paid",
            "partial_ratio": 0.65,
            "mode": "Bank Transfer",
            "is_wholesale": True
        },
        # October 2026: Retail Walk-in
        {
            "inv_no": "INV-2026-PH08",
            "date": "2026-10-29",
            "time": "05:15 pm",
            "customer": {
                "name": "Rohan Banerjee",
                "phone": "+91 98300 44921",
                "email": "",
                "gstin": "",
                "billing_address": "Lake Gardens, Kolkata",
                "state": "West Bengal"
            },
            "items_spec": [
                ("MED-DOLO-650", 5, 34.0),
                ("MED-PAN-D", 3, 180.0),
                ("MED-BETAD-100", 1, 138.0)
            ],
            "status": "Paid",
            "mode": "UPI",
            "is_wholesale": False
        },
        # November 2026: Institutional Bulk Supply (Unpaid / Pending)
        {
            "inv_no": "INV-2026-PH09",
            "date": "2026-11-06",
            "time": "03:10 pm",
            "customer": {
                "name": "Medanta Daycare & Diagnostics",
                "phone": "+91 98301 22910",
                "email": "procurement@medantadaycare.in",
                "gstin": "19AACCM5501Z1V",
                "billing_address": "Sector V, Salt Lake, Kolkata",
                "state": "West Bengal"
            },
            "items_spec": [
                ("MED-AZITH-500", 12, 175.0),
                ("MED-DETT-500", 8, 205.0),
                ("MED-MASK-N95", 20, 290.0)
            ],
            "status": "Unpaid",
            "mode": "Bank Transfer",
            "is_wholesale": True
        },
        # November 2026: Retail Walk-in OTC
        {
            "inv_no": "INV-2026-PH10",
            "date": "2026-11-16",
            "time": "08:20 pm",
            "customer": {
                "name": "Anita Sen",
                "phone": "+91 98317 22890",
                "email": "anita.sen88@gmail.com",
                "gstin": "",
                "billing_address": "Ballygunge Circular Road, Kolkata",
                "state": "West Bengal"
            },
            "items_spec": [
                ("MED-DOLO-650", 3, 34.0),
                ("MED-THERM-DIG", 1, 210.0),
                ("MED-ELEC-ORS", 1, 475.0)
            ],
            "status": "Paid",
            "mode": "UPI",
            "is_wholesale": False
        }
    ]

    for bp in invoice_blueprints:
        line_items = [make_item(sku, qty, custom_price) for sku, qty, custom_price in bp["items_spec"]]
        gross_subtotal = round(sum(i["gross_amount"] for i in line_items), 2)
        total_taxable = gross_subtotal
        total_cgst = round(sum(i["cgst_amount"] for i in line_items), 2)
        total_sgst = round(sum(i["sgst_amount"] for i in line_items), 2)
        total_tax = round(total_cgst + total_sgst, 2)
        final_payable = round(total_taxable + total_tax, 2)

        # Tax breakdown summary
        rate_groups = {}
        for it in line_items:
            r = it["gst_rate"]
            if r not in rate_groups:
                rate_groups[r] = {"rate": r, "taxable": 0.0, "cgst": 0.0, "sgst": 0.0, "igst": 0.0, "total_tax": 0.0}
            rate_groups[r]["taxable"] += it["taxable_amount"]
            rate_groups[r]["cgst"] += it["cgst_amount"]
            rate_groups[r]["sgst"] += it["sgst_amount"]
            rate_groups[r]["total_tax"] += it["total_tax"]

        tax_breakdown = [
            {
                "rate": g["rate"],
                "taxable": round(g["taxable"], 2),
                "cgst": round(g["cgst"], 2),
                "sgst": round(g["sgst"], 2),
                "igst": 0.0,
                "total_tax": round(g["total_tax"], 2)
            }
            for g in rate_groups.values()
        ]

        # Payment status calculations
        p_status = bp["status"]
        if p_status == "Paid":
            amt_paid = final_payable
            bal_due = 0.0
        elif p_status == "Partially Paid":
            amt_paid = round(final_payable * bp.get("partial_ratio", 0.5), 2)
            bal_due = round(final_payable - amt_paid, 2)
        else: # Unpaid
            amt_paid = 0.0
            bal_due = final_payable

        invoice_doc = {
            "invoice_number": bp["inv_no"],
            "invoice_date": bp["date"],
            "invoice_time": bp["time"],
            "due_date": "",
            "template": "classic",
            "seller_snapshot": seller_snapshot,
            "customer": bp["customer"],
            "is_interstate": False,
            "items": line_items,
            "subtotal_gross": gross_subtotal,
            "total_line_discounts": 0.0,
            "taxable_before_inv_discount": total_taxable,
            "invoice_discount_type": "percentage",
            "invoice_discount_value": 0.0,
            "invoice_discount_amount": 0.0,
            "total_net_taxable": total_taxable,
            "total_cgst": total_cgst,
            "total_sgst": total_sgst,
            "total_igst": 0.0,
            "total_tax": total_tax,
            "roundoff": 0.0,
            "final_payable_amount": final_payable,
            "tax_breakdown": tax_breakdown,
            "payment_status": p_status,
            "amount_paid": amt_paid,
            "balance_due": bal_due,
            "payment_mode": bp["mode"],
            "notes": "Thank you for your business. For medical advice, consult your physician." if not bp["is_wholesale"] else "Payment terms: Net 15 days.",
            "terms_conditions": "1. Goods once sold will not be returned.\n2. Schedule H drugs sold only against valid prescription.",
            "created_by": "staffp01",
            "staff_name": biller.get("full_name", "Rahul Kumar"),
            "staff_role": "staff",
            "business_id": pharmacy_id,
            "created_at": datetime.strptime(f"{bp['date']} 12:00:00", "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc),
            "updated_at": datetime.strptime(f"{bp['date']} 12:00:00", "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        }

        invoices_col.insert_one(invoice_doc)

    total_pharma_invoices = invoices_col.count_documents({"business_id": pharmacy_id})
    print(f"Seeded {total_pharma_invoices} invoices for {pharmacy_biz.get('business_name')} billed by Rahul Kumar.")
    print("All seeding successfully finished!")

if __name__ == "__main__":
    run_seed()
