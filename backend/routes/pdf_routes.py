import io
from bson import ObjectId
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm

from database import invoices_col
from auth import require_staff_or_admin

router = APIRouter(prefix="/api/invoices", tags=["Invoice PDF Generation"])

# Custom Colors matching HisabKitab palette
COLOR_FOREST = colors.HexColor("#243C32")
COLOR_COPPER = colors.HexColor("#B87352")
COLOR_CHARCOAL = colors.HexColor("#292D2A")
COLOR_STONE = colors.HexColor("#D8D0C2")
COLOR_STONE_LIGHT = colors.HexColor("#F5F1E8")
COLOR_PAPER = colors.HexColor("#FFFFFF")
COLOR_PAID = colors.HexColor("#1D603A")
COLOR_UNPAID = colors.HexColor("#A12620")
COLOR_PARTIAL = colors.HexColor("#965B16")

def build_pdf_buffer(inv: dict, template_style: str = "classic") -> io.BytesIO:
    """Generate high-fidelity, printable A4 vector PDF using ReportLab."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm
    )

    styles = getSampleStyleSheet()
    
    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=COLOR_FOREST
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=COLOR_CHARCOAL
    )
    
    label_style = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=COLOR_COPPER if template_style == "premium" else COLOR_FOREST
    )

    val_style = ParagraphStyle(
        'MetaValue',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=COLOR_CHARCOAL
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        alignment=1, # Center
        textColor=COLOR_PAPER if template_style == "premium" else COLOR_FOREST
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=COLOR_CHARCOAL
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=COLOR_CHARCOAL
    )

    story = []

    seller = inv.get("seller_snapshot", {})
    customer = inv.get("customer", {})
    inv_num = inv.get("invoice_number", "INV")
    inv_date = inv.get("invoice_date", "")
    inv_time = inv.get("invoice_time", "")
    due_date = inv.get("due_date", "")
    status_str = inv.get("payment_status", "Unpaid").upper()
    date_display = f"{inv_date} {inv_time}" if inv_time else inv_date

    # --- TOP HEADER BLOCK ---
    header_left = [
        Paragraph(seller.get("business_name", "Enterprises"), title_style),
        Spacer(1, 2 * mm),
        Paragraph(f"{seller.get('address', '')}", subtitle_style),
        Paragraph(f"State: {seller.get('state', '')} | Phone: {seller.get('phone', '')}", subtitle_style),
        Paragraph(f"<b>GSTIN:</b> {seller.get('gstin', 'N/A')} | Email: {seller.get('email', '')}", subtitle_style)
    ]

    status_color = COLOR_PAID if "PAID" == status_str else (COLOR_PARTIAL if "PARTIAL" in status_str else COLOR_UNPAID)

    header_right = [
        Paragraph("TAX INVOICE", ParagraphStyle('TaxTitle', fontName='Helvetica-Bold', fontSize=14, alignment=2, textColor=COLOR_FOREST)),
        Spacer(1, 1 * mm),
        Paragraph(f"<b>Invoice No:</b> {inv_num}", ParagraphStyle('RightMeta', fontName='Helvetica', fontSize=9, alignment=2, textColor=COLOR_CHARCOAL)),
        Paragraph(f"<b>Date & Time:</b> {date_display}", ParagraphStyle('RightMetaDate', fontName='Helvetica', fontSize=8.5, alignment=2, textColor=COLOR_CHARCOAL)),
        Paragraph(f"<b>Due Date:</b> {due_date or 'Immediate'}", ParagraphStyle('RightMetaDue', fontName='Helvetica', fontSize=8.5, alignment=2, textColor=COLOR_CHARCOAL)),
        Spacer(1, 1.5 * mm),
        Paragraph(f"<b>STATUS: {status_str}</b>", ParagraphStyle('RightMetaStatus', fontName='Helvetica-Bold', fontSize=9, alignment=2, textColor=status_color))
    ]

    header_table = Table([[header_left, header_right]], colWidths=[110 * mm, 72 * mm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 4 * mm))

    # --- DIVIDER LINE ---
    line_table = Table([['']], colWidths=[182 * mm], rowHeights=[1.5])
    line_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_COPPER if template_style == "premium" else COLOR_STONE),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(line_table)
    story.append(Spacer(1, 3 * mm))

    # --- CUSTOMER / BILL TO BLOCK ---
    bill_to_content = [
        Paragraph("<b>BILLED TO (CUSTOMER DETAILS)</b>", label_style),
        Spacer(1, 1 * mm),
        Paragraph(f"<b>Name:</b> {customer.get('name', 'Cash Customer')}", val_style),
        Paragraph(f"<b>Address:</b> {customer.get('billing_address', 'N/A')}", val_style),
        Paragraph(f"<b>State:</b> {customer.get('state', 'N/A')} | <b>Phone:</b> {customer.get('phone', 'N/A')}", val_style),
        Paragraph(f"<b>Customer GSTIN:</b> {customer.get('gstin') or 'Unregistered'}", val_style)
    ]

    dispatch_content = [
        Paragraph("<b>TRANSACTION & SUPPLY DETAILS</b>", label_style),
        Spacer(1, 1 * mm),
        Paragraph(f"<b>Place of Supply:</b> {customer.get('state', seller.get('state', ''))}", val_style),
        Paragraph(f"<b>Supply Type:</b> {'Inter-State (IGST)' if inv.get('is_interstate') else 'Intra-State (CGST + SGST)'}", val_style),
        Paragraph(f"<b>Payment Mode:</b> {inv.get('payment_mode', 'Cash')}", val_style),
        Paragraph(f"<b>Amount Paid:</b> Rs. {inv.get('amount_paid', 0.0):,.2f}", val_style)
    ]

    party_table = Table([[bill_to_content, dispatch_content]], colWidths=[95 * mm, 87 * mm])
    party_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_STONE_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_STONE),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(party_table)
    story.append(Spacer(1, 4 * mm))

    # --- LINE ITEMS TABLE ---
    # Width total: 182mm -> 8 + 60 + 20 + 16 + 22 + 16 + 18 + 22 = 182mm
    item_rows = [
        [
            Paragraph("#", table_header_style),
            Paragraph("Item Description", table_header_style),
            Paragraph("SKU / Batch", table_header_style),
            Paragraph("Qty", table_header_style),
            Paragraph("Rate (Rs)", table_header_style),
            Paragraph("Disc", table_header_style),
            Paragraph("Taxable", table_header_style),
            Paragraph("Total (Rs)", table_header_style)
        ]
    ]

    items = inv.get("items", [])
    for idx, item in enumerate(items, start=1):
        # Description with optional extra metadata
        desc_text = f"<b>{item.get('name', '')}</b>"
        extra_info = []
        if item.get("batch_number"):
            extra_info.append(f"Batch: {item['batch_number']}")
        if item.get("expiry_date"):
            extra_info.append(f"Exp: {item['expiry_date']}")
        if item.get("part_number"):
            extra_info.append(f"Part #: {item['part_number']}")
        if extra_info:
            desc_text += f"<br/><font size=6.5 color='#68706B'>{' | '.join(extra_info)}</font>"

        sku_col = f"{item.get('sku', '')}<br/><font size=6.5 color='#68706B'>GST: {item.get('gst_rate', 0)}%</font>"
        qty_col = f"{item.get('quantity', 0)} {item.get('unit', 'Pcs')}"
        rate_col = f"{item.get('unit_price', 0.0):,.2f}"
        disc_col = f"{item.get('line_discount', 0.0):,.2f}" if item.get('line_discount', 0) > 0 else "-"
        taxable_col = f"{item.get('taxable_amount', 0.0):,.2f}"
        total_col = f"{item.get('line_total', 0.0):,.2f}"

        item_rows.append([
            Paragraph(str(idx), table_cell_style),
            Paragraph(desc_text, table_cell_style),
            Paragraph(sku_col, table_cell_style),
            Paragraph(qty_col, table_cell_style),
            Paragraph(rate_col, table_cell_style),
            Paragraph(disc_col, table_cell_style),
            Paragraph(taxable_col, table_cell_style),
            Paragraph(total_col, table_cell_bold)
        ])

    table_style_list = [
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_STONE),
    ]

    if template_style == "premium":
        table_style_list.append(('BACKGROUND', (0, 0), (-1, 0), COLOR_FOREST))
    else:
        table_style_list.append(('BACKGROUND', (0, 0), (-1, 0), COLOR_STONE_LIGHT))

    # Alternate row background
    for r in range(1, len(item_rows)):
        if r % 2 == 0:
            table_style_list.append(('BACKGROUND', (0, r), (-1, r), colors.HexColor("#FAFAF8")))

    items_table = Table(
        item_rows,
        colWidths=[8 * mm, 60 * mm, 22 * mm, 16 * mm, 20 * mm, 16 * mm, 18 * mm, 22 * mm]
    )
    items_table.setStyle(TableStyle(table_style_list))
    story.append(items_table)
    story.append(Spacer(1, 4 * mm))

    # --- BOTTOM SECTION: BANK/TERMS (LEFT) & TOTALS MATRIX (RIGHT) ---
    bank_lines = [
        Paragraph("<b>BANK & PAYMENT DETAILS</b>", label_style),
        Paragraph(f"Bank Name: {seller.get('bank_name', 'N/A')}", val_style),
        Paragraph(f"A/C Number: {seller.get('bank_account_no', 'N/A')}", val_style),
        Paragraph(f"IFSC Code: {seller.get('bank_ifsc', 'N/A')}", val_style),
        Paragraph(f"UPI ID: {seller.get('upi_id', 'N/A')}", val_style),
        Spacer(1, 2 * mm),
        Paragraph("<b>TERMS & CONDITIONS</b>", label_style),
        Paragraph(inv.get("terms_conditions", "Goods once sold cannot be returned.").replace("\n", "<br/>"), subtitle_style)
    ]

    # Calculations summary
    totals_data = [
        [Paragraph("Gross Subtotal:", val_style), Paragraph(f"Rs. {inv.get('subtotal_gross', 0.0):,.2f}", val_style)],
    ]
    if inv.get("total_line_discounts", 0) > 0:
        totals_data.append([Paragraph("Item Discounts:", val_style), Paragraph(f"- Rs. {inv.get('total_line_discounts', 0.0):,.2f}", val_style)])
    if inv.get("invoice_discount_amount", 0) > 0:
        totals_data.append([Paragraph("Invoice Discount:", val_style), Paragraph(f"- Rs. {inv.get('invoice_discount_amount', 0.0):,.2f}", val_style)])
    
    totals_data.append([Paragraph("Taxable Value:", ParagraphStyle('TVal', fontName='Helvetica-Bold', fontSize=8.5, textColor=COLOR_CHARCOAL)), 
                        Paragraph(f"Rs. {inv.get('total_net_taxable', 0.0):,.2f}", ParagraphStyle('TValR', fontName='Helvetica-Bold', fontSize=8.5, textColor=COLOR_CHARCOAL))])

    if inv.get("is_interstate"):
        totals_data.append([Paragraph("IGST (Integrated Tax):", val_style), Paragraph(f"Rs. {inv.get('total_igst', 0.0):,.2f}", val_style)])
    else:
        totals_data.append([Paragraph("CGST (Central Tax):", val_style), Paragraph(f"Rs. {inv.get('total_cgst', 0.0):,.2f}", val_style)])
        totals_data.append([Paragraph("SGST (State Tax):", val_style), Paragraph(f"Rs. {inv.get('total_sgst', 0.0):,.2f}", val_style)])

    if inv.get("roundoff", 0) != 0:
        totals_data.append([Paragraph("Round Off:", val_style), Paragraph(f"{inv.get('roundoff', 0.0):+,.2f}", val_style)])

    grand_total_style = ParagraphStyle(
        'GrandTotalStyle',
        fontName='Helvetica-Bold',
        fontSize=11,
        textColor=COLOR_FOREST if template_style == "classic" else COLOR_COPPER
    )
    grand_val_style = ParagraphStyle(
        'GrandValStyle',
        fontName='Helvetica-Bold',
        fontSize=11,
        alignment=2,
        textColor=COLOR_FOREST if template_style == "classic" else COLOR_COPPER
    )
    totals_data.append([Paragraph("FINAL PAYABLE (Rs):", grand_total_style), Paragraph(f"Rs. {inv.get('final_payable_amount', 0.0):,.2f}", grand_val_style)])

    # Balance due if any
    balance = inv.get("balance_due", 0.0)
    if balance > 0:
        totals_data.append([Paragraph("Balance Due:", ParagraphStyle('BalDue', fontName='Helvetica-Bold', fontSize=9, textColor=COLOR_UNPAID)),
                            Paragraph(f"Rs. {balance:,.2f}", ParagraphStyle('BalDueR', fontName='Helvetica-Bold', fontSize=9, alignment=2, textColor=COLOR_UNPAID))])

    totals_table = Table(totals_data, colWidths=[42 * mm, 40 * mm])
    totals_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('LINEBELOW', (0, -2), (-1, -2), 1, COLOR_STONE),
        ('LINEBELOW', (0, -1), (-1, -1), 1.5, COLOR_FOREST if template_style == "classic" else COLOR_COPPER),
    ]))

    bottom_table = Table([[bank_lines, totals_table]], colWidths=[96 * mm, 86 * mm])
    bottom_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    
    # Signature line
    sig_table = Table([
        [
            Paragraph("This is a computer generated tax invoice.", subtitle_style),
            Paragraph(f"For <b>{seller.get('business_name', 'Authorized Business')}</b><br/><br/><br/>Authorized Signatory", ParagraphStyle('Sig', fontName='Helvetica', fontSize=8, alignment=2, textColor=COLOR_CHARCOAL))
        ]
    ], colWidths=[100 * mm, 82 * mm], style=[('VALIGN', (0, 0), (-1, -1), 'BOTTOM')])

    story.append(KeepTogether([bottom_table, Spacer(1, 4 * mm), sig_table]))

    doc.build(story)
    buffer.seek(0)
    return buffer

@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: str,
    template: str = "classic",
    user: dict = Depends(require_staff_or_admin)
):
    """Generate and stream vector printable A4 PDF invoice."""
    try:
        inv = invoices_col.find_one({"_id": ObjectId(invoice_id)})
    except Exception:
        inv = invoices_col.find_one({"invoice_number": invoice_id})
        
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice record not found.")

    selected_template = template if template in ("classic", "premium") else inv.get("template", "classic")
    pdf_buffer = build_pdf_buffer(inv, template_style=selected_template)
    
    filename = f"{inv.get('invoice_number', 'invoice')}.pdf"
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"'
        }
    )
