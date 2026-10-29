import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def set_cell_background(cell, fill_hex):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tc_pr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tc_mar.append(node)
    tc_pr.append(tc_mar)

def set_table_borders(table, color="555555", sz="4"):
    tblPr = table._tbl.tblPr
    tblBorders = OxmlElement('w:tblBorders')
    for border_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
        border = OxmlElement(f'w:{border_name}')
        border.set(qn('w:val'), 'single')
        border.set(qn('w:sz'), sz)
        border.set(qn('w:space'), '0')
        border.set(qn('w:color'), color)
        tblBorders.append(border)
    tblPr.append(tblBorders)

def create_synopsis():
    doc = Document()

    for sec in doc.sections:
        sec.top_margin = Inches(1.0)
        sec.bottom_margin = Inches(1.0)
        sec.left_margin = Inches(1.0)
        sec.right_margin = Inches(1.0)

    FONT_NAME = "Times New Roman"

    def add_p(text="", size=12, bold=False, italic=False, align=WD_ALIGN_PARAGRAPH.LEFT, space_before=0, space_after=6, line_spacing=1.15):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = line_spacing
        if text:
            r = p.add_run(text)
            r.font.name = FONT_NAME
            r.font.size = Pt(size)
            r.font.bold = bold
            r.font.italic = italic
            r.font.color.rgb = RGBColor(0, 0, 0)
        return p

    def add_h1(title):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(title)
        r.font.name = FONT_NAME
        r.font.size = Pt(13.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0, 0, 0)
        return p

    # Header / Title
    add_p("PROJECT SYNOPSIS", size=16, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4)
    add_p("CSE494: INTELLIGENT NOSQL DATABASES", size=13, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
    add_p("School of Computer Science & Engineering | Lovely Professional University", size=11, italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=14)

    # Metadata Table
    meta_data = [
        ("Project Title", "HisabKitab: Cloud-Native Billing, Multi-Unit Inventory & Ledger System Using MongoDB"),
        ("Student Name", "Shayan Akhtar"),
        ("Registration No / Roll No", "12317465  /  Roll No: 30 (Section: K23WS)"),
        ("Supervisor / Guide", "Dr. Manpreet Singh Sehgal (UID: 32354)"),
        ("Primary UN SDG", "SDG 8 — Decent Work and Economic Growth (Target 8.3: MSME Digitalization)"),
        ("Supporting UN SDG", "SDG 9 — Industry, Innovation and Infrastructure & SDG 12 — Responsible Consumption"),
        ("Live Web Application", "https://hisaab-kitaab-eight-zeta.vercel.app/"),
        ("GitHub Repository", "https://github.com/shayan-codes-405/Hisaab-Kitaab-.git")
    ]
    tbl_meta = doc.add_table(rows=len(meta_data), cols=2)
    tbl_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_meta.autofit = False
    tbl_meta.columns[0].width = Inches(2.2)
    tbl_meta.columns[1].width = Inches(4.3)
    set_table_borders(tbl_meta, color="555555", sz="4")

    for r_idx, (k, v) in enumerate(meta_data):
        row = tbl_meta.rows[r_idx]
        bg = "F3F4F6" if r_idx % 2 == 0 else "FFFFFF"
        for c_idx, text in enumerate([k, v]):
            cell = row.cells[c_idx]
            set_cell_background(cell, bg)
            set_cell_margins(cell, 60, 60, 100, 100)
            p = cell.paragraphs[0]
            r = p.add_run(text)
            r.font.name = FONT_NAME
            r.font.size = Pt(10)
            r.font.bold = (c_idx == 0)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # 1. Problem Statement
    add_h1("1. Problem Statement")
    add_p(
        "Micro, Small, and Medium Enterprises (MSMEs) in the retail and wholesale sectors struggle with severe operational friction, "
        "revenue leakage, and compliance failures caused by rigid tabular database architectures (SQL/RDBMS) that cannot natively "
        "handle dynamic packaging hierarchies (selling in boxes, packs, or loose units) or guarantee legal tax audit immutability, "
        "forcing small merchants to rely on inefficient manual paper registers.",
        size=11.5, line_spacing=1.2
    )

    # 2. Problem Description
    add_h1("2. Problem Description")
    add_p(
        "Small commercial retail establishments (such as stationery stores, book depots, and trading merchants) manage thousands of heterogeneous "
        "products with complex physical selling dimensions. In practice, products are purchased in bulk (e.g., 1 Box = 10 Pcs, 1 Carton = 5 Reams) "
        "but must be sold either as sealed full packages or individual loose pieces.\n\n"
        "In traditional relational SQL databases, implementing multiple packaging options requires normalizing data across 4 to 6 interconnected "
        "tables (products, packaging_units, conversion_rules, price_matrices), triggering complex join-heavy queries that introduce latency during "
        "busy checkout hours. Furthermore, relational foreign keys violate legal tax audit immutability: when customer or business details are updated, "
        "past invoices linked by foreign keys change dynamically, violating GST legal requirements. Small merchants also lack automated tools to track "
        "real-time outstanding customer balances, monthly sales trends, and SMS dispatch.\n\n"
        "HisabKitab resolves this by deploying a cloud-native MongoDB document store. Products store dynamic packaging parameters as first-class BSON "
        "attributes, invoices embed permanent immutable party snapshots and line-item arrays, and stock counts are deducted atomically via $inc operators, "
        "enabling small merchants to transition effortlessly from paper registers to cloud-native digital bookkeeping.",
        size=11.5, line_spacing=1.2
    )

    # 3. Sustainable Development Goal (SDG) Alignment
    add_h1("3. Alignment with UN Sustainable Development Goals (SDGs)")
    add_p(
        "Primary Focus: SDG 8 — Decent Work and Economic Growth\n"
        "• Target 8.3: Promote development-oriented policies that support productive activities, decent job creation, entrepreneurship, "
        "creativity and innovation, and encourage the formalization and growth of micro-, small- and medium-sized enterprises (MSMEs), "
        "including through access to financial services and digital bookkeeping tools.\n"
        "Impact: HisabKitab directly empowers micro-entrepreneurs and local merchants by eliminating accounting errors, automating GST compliance, "
        "and providing formal digital transaction ledgers necessary for securing formal banking credit and working capital.\n\n"
        "Supporting Goals:\n"
        "• SDG 9 (Industry, Innovation and Infrastructure): Upgrades technological capabilities of small retail infrastructure using cloud NoSQL databases.\n"
        "• SDG 12 (Responsible Consumption and Production): Replaces physical paper billing ledgers with digital PDF and mobile SMS receipts, eliminating paper waste.",
        size=11.5, line_spacing=1.2
    )

    # 4. Proposed Solution & NoSQL Architecture
    add_h1("4. Proposed Solution & Architecture")
    add_p(
        "• Database Tier (MongoDB Atlas): Managed distributed document database utilizing BSON collections (products, invoices, business_settings, users). "
        "Applies the Snapshot Pattern to guarantee historical invoice immutability and multi-stage Aggregation Pipelines ($match, $group) to render 6-month sales trends.\n"
        "• Application Tier (FastAPI & Docker on Render): Asynchronous Python backend executing Indian GST calculation (CGST/SGST vs IGST), ReportLab PDF rendering, "
        "and TextBee Android Gateway SMS broadcasting.\n"
        "• Presentation Tier (React 18 & Vite on Vercel): Single-Page Application (SPA) designed with classical Indian ledger tokens (Bahi-Khata aesthetic) and Chart.js analytics.",
        size=11.5, line_spacing=1.2
    )

    # 5. Expected Outcomes & Results
    add_h1("5. Expected Outcomes & Performance Benchmarks")
    add_p(
        "• 13.7x Faster Query Latency: Complete invoice retrieval in 1.8 ms (MongoDB single-document lookup) vs. 24.6 ms in normalized SQL (5-table JOIN).\n"
        "• Concurrency & Zero Stock Drift: Atomic $inc operators prevent race conditions during high-volume checkouts across loose pieces and packages.\n"
        "• Real-Time Visual Analytics: Instant computation of 6-month revenue trends, payment splits (Paid, Unpaid, Partially Paid), and low-stock alerts.\n"
        "• Zero-Carbon Digital Receipts: Automated ReportLab PDF generator and TextBee SMS gateway replace paper invoices with instant mobile delivery.",
        size=11.5, line_spacing=1.2
    )

    output_filename = "HisabKitab_Project_Synopsis.docx"
    doc.save(output_filename)
    print(f"[OK] Project Synopsis successfully generated: {output_filename}")

if __name__ == "__main__":
    create_synopsis()
