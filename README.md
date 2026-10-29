# HisabKitab — Billing, Inventory & Business Management System

> **Tagline**: Professional Indian business software for GST invoicing, inventory tracking, and ledger accounting. Inspired by traditional accounting ledgers (*Bahikhata*) and archival stationery.

---

## 1. Technology Stack

- **Backend**: Python 3.14 + **FastAPI** + Uvicorn
- **Frontend**: **React** + **Vite** (Vanilla JavaScript, ES6+)
- **Styling**: Plain CSS with custom design tokens (Warm Ivory `#F5F1E8`, Forest Green `#243C32`, Muted Copper `#B87352`, Stone Grey `#D8D0C2`, Charcoal `#292D2A`, Paper White `#FFFFFF`)
- **Database**: **MongoDB Community / Atlas** via **PyMongo** (Mandatory primary database)
- **Vector PDF Generator**: **ReportLab 5.0.1** (Clean A4 printing with dual templates)
- **Charts**: **Chart.js**
- **SMS Gateway**: **TextBee Android SMS Gateway REST API** (with test/demo simulation mode)
- **Environment**: `python-dotenv`

---

## 2. Quick Start Guide

### Prerequisites
1. **Python 3.10+** (Python 3.14 installed)
2. **Node.js 18+** & npm (Node v24.11 installed)
3. **MongoDB** installed and running locally on `localhost:27017` (or MongoDB Atlas connection URI)

### Quick Run (Windows)
Double-click `run.bat` or run:
```cmd
run.bat
```
This automatically launches the FastAPI backend on port 8000 and the Vite frontend on port 5173.

---

### Manual Step-by-Step Run

#### Step 1: Start MongoDB
Ensure the MongoDB service is active:
```powershell
# Check MongoDB status on Windows:
Get-Service -Name MongoDB
# If stopped, start it:
net start MongoDB
```

#### Step 2: Start the FastAPI Backend
Open a terminal in the project root:
```powershell
cd backend
python main.py
```
Backend will start on: **`http://localhost:8000`**
- Interactive Swagger API docs: **`http://localhost:8000/docs`**
- Health Check: **`http://localhost:8000/api/health`**
*(Note: In production or standalone mode, `http://localhost:8000` also directly serves the compiled React app!)*

#### Step 3: Start the Vite React Frontend
Open a second terminal in the project root:
```powershell
cd frontend
npm run dev
```
Open your browser and navigate to: **`http://localhost:5173`**

---

## 3. Application Credentials & First-Run Setup

When you first launch the application, you will be greeted by the **System Setup Wizard**:
1. **Admin Account Setup**: Set your preferred administrator username and password (e.g., `admin` / `AdminPassword123!`).
2. **Business Profile**: Configure your firm's name, GSTIN (e.g., `27ABCDE1234F1Z5`), operating state, address, and bank details.
3. If the database already has an administrator, the secure **Business Login Screen** will appear.

---

## 4. Application Navigation Structure (Only 3 Sections)

The sidebar is compact, collapsible, and strictly limited to three primary sections:
1. **Dashboard**:
   - Total Gross Sales (₹) and invoice volume
   - Paid and unpaid summary balances
   - Estimated gross profit computed from recorded product purchase costs
   - Inventory health cards and low-stock alerts
   - 6-Month sales trend bar chart & payment split doughnut chart (Chart.js)
   - Recent invoices ledger
2. **Invoice** (Central Workflow Hub):
   - **Tab 1: Create GST Invoice**:
     - Auto-generated sequential invoice numbers (`INV-2026-0001`)
     - Customer details & auto-detection of intra-state (CGST + SGST) vs inter-state (IGST)
     - Inventory product autocomplete with real-time stock indicators
     - Configurable GST slabs (0%, 5%, 12%, 18%, 28%)
     - Line-item discounts (% or ₹) and invoice-level discounts (% or ₹)
     - Live interactive preview toggleable between **Classic Professional** and **Premium Forest Green**
     - Single-action stock deduction preventing negative inventory
   - **Tab 2: Invoice Ledger & History**:
     - Real-time search by customer, phone, GSTIN, or invoice number
     - Inline payment status updater (Paid, Unpaid, Partially Paid)
     - One-click ReportLab A4 vector PDF download (`INV-XXXX.pdf`)
     - TextBee SMS notification dispatch modal
   - **Tab 3: GST & SMS Gateway Settings**:
     - Business name, address, GSTIN, and bank account/IFSC/UPI information
     - TextBee Android SMS Gateway configuration (Device ID, API key, Demo mode toggle)
3. **Inventory**:
   - Multi-industry catalog supporting **Pharmacies** (batch number, expiry date), **Automotive** (OEM part number), and **General Retail** (SKU, Category, Unit)
   - Stock movement ledger (`INITIAL_STOCK`, `INVOICE_SALE`, `PURCHASE_RESTOCK`, `MANUAL_ADJUSTMENT`, `INVOICE_CANCEL_RESTOCK`)
   - Quick restock modal and low-stock threshold alerts
   - Full CRUD operations with server-side role permission checks

---

## 5. TextBee Android SMS Gateway Integration

HisabKitab integrates with the open-source **TextBee** Android SMS Gateway ([https://github.com/textbee/textbee](https://github.com/textbee/textbee)):
- **Demo / Simulation Mode (Default)**: If you do not have an active TextBee API key or Android device, the app operates in Demo Simulation Mode. All SMS triggers are validated, formatted, and logged into MongoDB (`sms_logs` collection) without failing or requiring physical hardware.
- **Live Dispatch Mode**: Configure your `TEXTBEE_API_KEY` and `TEXTBEE_DEVICE_ID` either in `.env` or in the **Invoice -> GST & SMS Gateway Settings** tab. SMS notifications are then routed through your Android smartphone.

---

## 6. MongoDB Collections & Indexes

The application automatically connects to MongoDB `hisabkitab_db` and initializes the following indexed collections:
- `users`: Stores admin and staff credentials with salted PBKDF2-HMAC-SHA256 password hashes. Unique index on `username`.
- `business_settings`: Single configuration document for business profile, GSTIN, bank details, and SMS settings.
- `products`: Product catalog with unique index on `sku`, index on `category`.
- `invoices`: Invoices with immutable line-item snapshots and unique index on `invoice_number`.
- `stock_movements`: Stock audit trail with compound index on `(product_id, created_at)`.
- `sms_logs`: Dispatch audit logs with index on `created_at`.

---

## 7. Running the Test Suite

An automated test suite is provided to verify the complete workflow:
```powershell
python "scratch/test_workflow.py"
```
This tests:
1. Auth status & Admin setup
2. Multi-industry product creation
3. Intra-state GST invoice calculation & atomic stock deduction
4. Inter-state IGST invoice creation
5. ReportLab vector PDF generation for both templates
6. TextBee SMS dispatch & audit logging
7. Dynamic MongoDB dashboard metrics aggregation

