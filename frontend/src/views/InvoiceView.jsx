import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Isolated, reliable printing engine via dynamic iframe
export const printInvoiceViaIframe = (inv, seller) => {
  if (!inv) return;
  const oldFrame = document.getElementById('hk-print-frame');
  if (oldFrame) oldFrame.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'hk-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;

  const bName = seller?.business_name || inv.seller_snapshot?.business_name || 'Akhtar Enterprises';
  const bAddr = seller?.address || inv.seller_snapshot?.address || '';
  const bGstin = seller?.gstin || inv.seller_snapshot?.gstin || '';
  const bPhone = seller?.phone || inv.seller_snapshot?.phone || '';
  const bEmail = seller?.email || inv.seller_snapshot?.email || '';
  const bState = seller?.state || inv.seller_snapshot?.state || 'Maharashtra';
  const bankName = seller?.bank_name || inv.seller_snapshot?.bank_name || '';
  const bankAcc = seller?.bank_account_no || inv.seller_snapshot?.bank_account_no || '';
  const bankIfsc = seller?.bank_ifsc || inv.seller_snapshot?.bank_ifsc || '';
  const upiId = seller?.upi_id || inv.seller_snapshot?.upi_id || '';
  const terms = seller?.terms_conditions || inv.seller_snapshot?.terms_conditions || '1. Goods once sold are not returnable. 2. Interest @ 18% p.a. charged after due date.';

  const isInter = inv.is_interstate;
  const items = inv.items || [];

  const itemsHtml = items.map((it, idx) => {
    const itTax = Number(it.tax_amount ?? ((it.cgst_amount || 0) + (it.sgst_amount || 0) + (it.igst_amount || 0)));
    return `
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #D8D0C2; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; border: 1px solid #D8D0C2;">
          <div style="font-weight: 700; color: #111;">${it.name || 'Item'}</div>
          ${it.sku ? `<div style="font-size: 10px; color: #666;">SKU: ${it.sku}</div>` : ''}
          ${it.batch_number ? `<div style="font-size: 10px; color: #666;">Batch: ${it.batch_number}</div>` : ''}
        </td>
        <td style="padding: 6px 8px; border: 1px solid #D8D0C2; text-align: right;">${it.quantity} ${it.unit || 'Pcs'}</td>
        <td style="padding: 6px 8px; border: 1px solid #D8D0C2; text-align: right;">₹${Number(it.unit_price || 0).toFixed(2)}</td>
        <td style="padding: 6px 8px; border: 1px solid #D8D0C2; text-align: right; color: #991B1B;">${Number(it.discount_amount || 0) > 0 ? `₹${Number(it.discount_amount).toFixed(2)}` : '-'}</td>
        <td style="padding: 6px 8px; border: 1px solid #D8D0C2; text-align: right;">₹${Number(it.taxable_amount || 0).toFixed(2)}</td>
        <td style="padding: 6px 8px; border: 1px solid #D8D0C2; text-align: center;">${it.gst_rate ?? 18}%</td>
        <td style="padding: 6px 8px; border: 1px solid #D8D0C2; text-align: right;">₹${itTax.toFixed(2)}</td>
        <td style="padding: 6px 8px; border: 1px solid #D8D0C2; text-align: right; font-weight: 700;">₹${Number(it.line_total || 0).toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Tax Invoice - ${inv.invoice_number}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body { font-size: 10pt; color: #1a1a1a; line-height: 1.35; padding: 12px; }
        .header-table { width: 100%; border-bottom: 2.5px solid #243C32; padding-bottom: 12px; margin-bottom: 14px; }
        .biz-title { font-size: 18pt; font-weight: 800; color: #243C32; text-transform: uppercase; letter-spacing: -0.02em; margin-bottom: 3px; }
        .inv-title { font-size: 16pt; font-weight: 800; color: #243C32; text-align: right; letter-spacing: 0.05em; }
        .meta-box { border: 1px solid #D8D0C2; border-radius: 4px; padding: 10px 12px; margin-bottom: 14px; background: #fafafa; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 9.5pt; }
        .items-table th { background: #243C32; color: #fff; padding: 7px 8px; text-align: left; font-weight: 700; border: 1px solid #243C32; }
        .summary-table { width: 100%; border-collapse: collapse; font-size: 10pt; border: 1px solid #D8D0C2; }
        .summary-table td { padding: 5px 10px; border-bottom: 1px solid #E5E0D8; }
        .status-badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 8.5pt; font-weight: 700; text-transform: uppercase; background: #e9f5ee; color: #1d603a; border: 1px solid #bde4cc; }
      </style>
    </head>
    <body>
      <table class="header-table" style="width: 100%;">
        <tr>
          <td style="vertical-align: top;">
            <div class="biz-title">${bName}</div>
            ${bAddr ? `<div style="font-size: 9.5pt; color: #444;">${bAddr}</div>` : ''}
            <div style="font-size: 9pt; color: #444; margin-top: 2px;">
              ${bGstin ? `<b>GSTIN:</b> ${bGstin} • ` : ''}<b>State:</b> ${bState}
              ${bPhone ? ` • <b>Tel:</b> ${bPhone}` : ''}
              ${bEmail ? ` • <b>Email:</b> ${bEmail}` : ''}
            </div>
          </td>
          <td style="vertical-align: top; text-align: right; width: 220px;">
            <div class="inv-title">TAX INVOICE</div>
            <div style="font-size: 10pt; margin-top: 4px;"><b>Invoice No:</b> <span style="font-family: monospace; font-weight: 700;">${inv.invoice_number}</span></div>
            <div style="font-size: 9.5pt; color: #555;"><b>Date:</b> ${inv.invoice_date} ${inv.invoice_time ? `• ${inv.invoice_time}` : ''}</div>
            ${inv.due_date ? `<div style="font-size: 9pt; color: #555;"><b>Due Date:</b> ${inv.due_date}</div>` : ''}
            <div style="margin-top: 4px;"><span class="status-badge">${inv.payment_status || 'Paid'}</span> (${inv.payment_mode || 'Cash'})</div>
          </td>
        </tr>
      </table>

      <!-- Customer / Place of Supply Box -->
      <table class="meta-box" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="vertical-align: top; width: 60%; padding: 4px 6px;">
            <div style="font-size: 8.5pt; font-weight: 800; color: #243C32; text-transform: uppercase; margin-bottom: 2px;">Billed To (Customer):</div>
            <div style="font-size: 11pt; font-weight: 700; color: #111;">${inv.customer?.name || 'Walk-in Customer'}</div>
            ${inv.customer?.billing_address ? `<div style="font-size: 9pt; color: #444;">${inv.customer.billing_address}</div>` : ''}
            <div style="font-size: 9pt; color: #444;"><b>Phone:</b> ${inv.customer?.phone || 'N/A'}${inv.customer?.email ? ` • <b>Email:</b> ${inv.customer.email}` : ''}</div>
            <div style="font-size: 9pt; color: #444;"><b>GSTIN:</b> ${inv.customer?.gstin || 'Unregistered Consumer'}</div>
          </td>
          <td style="vertical-align: top; width: 40%; text-align: right; padding: 4px 6px;">
            <div style="font-size: 8.5pt; font-weight: 800; color: #243C32; text-transform: uppercase; margin-bottom: 2px;">Place of Supply:</div>
            <div style="font-size: 10pt; font-weight: 700;">${inv.customer?.state || bState}</div>
            <div style="font-size: 9pt; color: #555; margin-top: 2px;">
              Nature: <b>${isInter ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}</b>
            </div>
            <div style="font-size: 8.5pt; color: #666;">Reverse Charge: <b>No</b></div>
          </td>
        </tr>
      </table>

      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 28px; text-align: center;">#</th>
            <th>Item Description</th>
            <th style="width: 65px; text-align: right;">Qty</th>
            <th style="width: 75px; text-align: right;">Unit Rate</th>
            <th style="width: 65px; text-align: right;">Disc</th>
            <th style="width: 75px; text-align: right;">Taxable</th>
            <th style="width: 55px; text-align: center;">GST %</th>
            <th style="width: 75px; text-align: right;">Tax (₹)</th>
            <th style="width: 85px; text-align: right;">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Bottom: Bank Details & Summary -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
        <tr>
          <td style="vertical-align: top; width: 55%; padding-right: 14px;">
            <div style="border: 1px solid #D8D0C2; border-radius: 4px; padding: 8px 10px; margin-bottom: 8px; font-size: 9pt; background: #fafafa;">
              <div style="font-weight: 800; color: #243C32; text-transform: uppercase; margin-bottom: 3px;">Bank & Payment Details:</div>
              ${bankName ? `<div><b>Bank:</b> ${bankName}</div>` : ''}
              ${bankAcc ? `<div><b>A/C No:</b> ${bankAcc}</div>` : ''}
              ${bankIfsc ? `<div><b>IFSC:</b> ${bankIfsc}</div>` : ''}
              ${upiId ? `<div><b>UPI ID:</b> ${upiId}</div>` : ''}
            </div>
            ${inv.notes ? `<div style="font-size: 8.5pt; color: #555; font-style: italic; margin-bottom: 6px;"><b>Notes:</b> ${inv.notes}</div>` : ''}
            <div style="font-size: 8pt; color: #666; border-top: 1px dashed #D8D0C2; padding-top: 4px;">
              <b>Terms & Conditions:</b> ${terms}
            </div>
          </td>
          <td style="vertical-align: top; width: 45%;">
            <table class="summary-table">
              <tr>
                <td style="color: #555;">Subtotal (Gross):</td>
                <td style="text-align: right; font-weight: 600;">₹${Number(inv.subtotal_gross || 0).toFixed(2)}</td>
              </tr>
              ${(Number(inv.total_line_discounts || 0) + Number(inv.invoice_discount_amount || 0)) > 0 ? `
                <tr style="color: #991B1B;">
                  <td>Total Discounts:</td>
                  <td style="text-align: right; font-weight: 600;">- ₹${(Number(inv.total_line_discounts || 0) + Number(inv.invoice_discount_amount || 0)).toFixed(2)}</td>
                </tr>
              ` : ''}
              <tr style="background: #F8F6F2;">
                <td style="font-weight: 700;">Taxable Value:</td>
                <td style="text-align: right; font-weight: 700;">₹${Number(inv.total_net_taxable || 0).toFixed(2)}</td>
              </tr>
              ${isInter ? `
                <tr>
                  <td style="color: #555;">IGST:</td>
                  <td style="text-align: right; font-weight: 600;">₹${Number(inv.total_igst || 0).toFixed(2)}</td>
                </tr>
              ` : `
                <tr>
                  <td style="color: #555;">CGST:</td>
                  <td style="text-align: right; font-weight: 600;">₹${Number(inv.total_cgst || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="color: #555;">SGST:</td>
                  <td style="text-align: right; font-weight: 600;">₹${Number(inv.total_sgst || 0).toFixed(2)}</td>
                </tr>
              `}
              <tr style="background: #243C32; color: #fff; font-size: 11pt;">
                <td style="font-weight: 800; padding: 7px 10px;">Final Payable:</td>
                <td style="text-align: right; font-weight: 900; padding: 7px 10px;">₹${Number(inv.final_payable_amount || 0).toFixed(2)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Signatures Footer -->
      <table style="width: 100%; border-top: 1px solid #D8D0C2; padding-top: 12px; margin-top: 18px;">
        <tr>
          <td style="font-size: 8.5pt; color: #666; vertical-align: bottom;">
            Computer-generated GST Tax Invoice. Valid without physical stamp.
          </td>
          <td style="text-align: center; width: 200px; vertical-align: bottom;">
            <div style="font-size: 9pt; font-weight: 700; color: #243C32;">For ${bName}</div>
            <div style="height: 38px;"></div>
            <div style="border-top: 1px solid #333; font-size: 9pt; font-weight: 600; padding-top: 3px;">
              Authorized Signatory
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
  }, 250);
};

export const InvoiceView = ({ defaultTab = 'history', viewInvoiceId = null, onClearViewInvoiceId, autoOpenCreator = false, onResetAutoOpen = null }) => {
  const { apiFetch, business, refreshBusiness, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals & Panels
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  useEffect(() => {
    if (autoOpenCreator) {
      handleOpenCreate();
      if (onResetAutoOpen) onResetAutoOpen();
    }
  }, [autoOpenCreator]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsTargetInvoice, setSmsTargetInvoice] = useState(null);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsCustomMsg, setSmsCustomMsg] = useState('');
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    business_name: '',
    gstin: '',
    phone: '',
    email: '',
    address: '',
    state: 'Maharashtra',
    invoice_prefix: 'INV',
    bank_name: '',
    bank_account_no: '',
    bank_ifsc: '',
    upi_id: '',
    terms_conditions: '',
    textbee_api_url: 'https://api.textbee.dev/api/v1',
    textbee_api_key: '',
    textbee_device_id: '',
    textbee_demo_mode: true
  });

  // --- INVOICE CREATOR FORM STATE ---
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    gstin: '',
    billing_address: '',
    state: business?.state || 'Maharashtra'
  });

  const getCurrentTimeStr = () => {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceTime, setInvoiceTime] = useState(getCurrentTimeStr());
  const [dueDate, setDueDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [invDiscountType, setInvDiscountType] = useState('percentage');
  const [invDiscountValue, setInvDiscountValue] = useState(0);
  const [notes, setNotes] = useState('');
  const [sendSMSOnCreate, setSendSMSOnCreate] = useState(true);
  const [smsNotificationMsg, setSmsNotificationMsg] = useState('');

  const [printInvoice, setPrintInvoice] = useState(null);

  // Line items
  const [items, setItems] = useState([
    {
      product_id: '',
      name: '',
      sku: '',
      unit: 'Pcs',
      base_unit: 'Pcs',
      conversion_factor: 1.0,
      quantity: 1,
      unit_price: 0,
      base_selling_price: 0,
      package_unit: '',
      package_qty: 1,
      package_selling_price: 0,
      gst_rate: 18,
      discount_type: 'percentage',
      discount_value: 0,
      batch_number: '',
      expiry_date: '',
      part_number: ''
    }
  ]);

  const [calculation, setCalculation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Invoices from MongoDB
  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('payment_status', statusFilter);
      const res = await apiFetch(`/api/invoices?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data || []);
      }
    } catch (err) {
      showToast('Error loading invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load Inventory Products for picker
  const loadProducts = async () => {
    try {
      const res = await apiFetch('/api/inventory?status_filter=all');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadInvoices();
    loadProducts();
  }, [statusFilter]);

  useEffect(() => {
    if (viewInvoiceId) {
      apiFetch(`/api/invoices/${viewInvoiceId}`).then(async (res) => {
        if (res.ok) {
          const inv = await res.json();
          setSelectedInvoice(inv);
        }
      });
      if (onClearViewInvoiceId) onClearViewInvoiceId();
    }
  }, [viewInvoiceId]);

  useEffect(() => {
    if (business) {
      setSettingsForm({
        business_name: business.business_name || '',
        gstin: business.gstin || '',
        phone: business.phone || '',
        email: business.email || '',
        address: business.address || '',
        state: business.state || 'Maharashtra',
        invoice_prefix: business.invoice_prefix || 'INV',
        bank_name: business.bank_name || '',
        bank_account_no: business.bank_account_no || '',
        bank_ifsc: business.bank_ifsc || '',
        upi_id: business.upi_id || '',
        terms_conditions: business.terms_conditions || '',
        textbee_api_url: business.textbee_api_url || 'https://api.textbee.dev/api/v1',
        textbee_api_key: business.textbee_api_key || '',
        textbee_device_id: business.textbee_device_id || '',
        textbee_demo_mode: business.textbee_demo_mode ?? true
      });
      setCustomer((prev) => ({ ...prev, state: business.state || 'Maharashtra' }));
    }
  }, [business]);

  // Recalculate live totals with debounce and full sanitization
  useEffect(() => {
    const timer = setTimeout(() => {
      const sanitizedItems = items
        .filter((it) => it.name && it.name.trim().length > 0)
        .map((it) => ({
          product_id: it.product_id || '',
          name: it.name.trim(),
          sku: it.sku || '',
          unit: it.unit || 'Pcs',
          conversion_factor: parseFloat(it.conversion_factor) || 1.0,
          base_unit: it.base_unit || it.unit || 'Pcs',
          quantity: it.quantity === '' ? 1 : parseFloat(it.quantity) || 0,
          unit_price: it.unit_price === '' ? 0 : parseFloat(it.unit_price) || 0,
          gst_rate: it.gst_rate === '' ? 0 : parseFloat(it.gst_rate) || 0,
          discount_type: it.discount_type || 'percentage',
          discount_value: it.discount_value === '' ? 0 : parseFloat(it.discount_value) || 0,
          batch_number: it.batch_number || '',
          expiry_date: it.expiry_date || '',
          part_number: it.part_number || ''
        }))
        .filter((it) => it.quantity > 0);

      if (sanitizedItems.length === 0) {
        setCalculation(null);
        return;
      }

      const payload = {
        customer: {
          name: customer.name || 'Walk-in Customer',
          phone: customer.phone || '',
          email: customer.email || '',
          gstin: customer.gstin || '',
          billing_address: customer.billing_address || '',
          state: customer.state || business?.state || 'Maharashtra'
        },
        items: sanitizedItems,
        invoice_level_discount_type: invDiscountType || 'percentage',
        invoice_level_discount_value: invDiscountValue === '' ? 0 : parseFloat(invDiscountValue) || 0
      };

      apiFetch('/api/invoices/calculate', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
        .then(async (res) => {
          if (!res.ok) return null;
          return res.json();
        })
        .then((calc) => {
          if (calc && Array.isArray(calc.processed_items)) {
            setCalculation(calc);
          }
        })
        .catch((err) => console.error('Live calculation error:', err));
    }, 200);

    return () => clearTimeout(timer);
  }, [items, customer.name, customer.state, invDiscountType, invDiscountValue]);

  // Item management
  const handleItemChange = (idx, field, val) => {
    const copy = [...items];
    copy[idx][field] = val;
    setItems(copy);
  };

  const handleSelectProduct = (idx, pId) => {
    const copy = [...items];
    const found = products.find((p) => p.id === pId);
    if (found) {
      const baseU = (found.unit && found.unit.toLowerCase() !== (found.package_unit || '').toLowerCase()) 
        ? found.unit 
        : 'Pcs';
      const pkgU = (found.package_unit && found.package_unit.toLowerCase() !== baseU.toLowerCase()) 
        ? found.package_unit 
        : '';
      const pkgQty = found.package_qty > 1 ? found.package_qty : 1;

      copy[idx] = {
        ...copy[idx],
        product_id: found.id,
        name: found.name,
        sku: found.sku,
        unit: baseU,
        base_unit: baseU,
        conversion_factor: 1.0,
        unit_price: found.selling_price || 0,
        base_selling_price: found.selling_price || 0,
        package_unit: pkgU,
        package_qty: pkgQty,
        package_selling_price: found.package_selling_price || (found.selling_price * pkgQty),
        gst_rate: found.gst_rate ?? 18,
        batch_number: found.batch_number || '',
        expiry_date: found.expiry_date || '',
        part_number: found.part_number || ''
      };
    } else {
      copy[idx] = {
        ...copy[idx],
        product_id: '',
        name: '',
        sku: '',
        unit: 'Pcs',
        base_unit: 'Pcs',
        conversion_factor: 1.0,
        unit_price: 0,
        base_selling_price: 0,
        package_unit: '',
        package_qty: 1,
        package_selling_price: 0
      };
    }
    setItems(copy);
  };

  const handleUnitChange = (idx, newUnit) => {
    const copy = [...items];
    const it = copy[idx];
    const isPackage = newUnit === 'package' || (it.package_unit && newUnit === it.package_unit);
    
    if (isPackage && it.package_unit && it.package_qty > 1) {
      // Selling in packaging unit (e.g. Box of 10 Pcs)
      const pkgPrice = it.package_selling_price > 0 
        ? Number(it.package_selling_price) 
        : (Number(it.base_selling_price || it.unit_price) * (it.package_qty || 1.0));
      copy[idx] = {
        ...it,
        unit: it.package_unit,
        conversion_factor: it.package_qty || 1.0,
        unit_price: pkgPrice
      };
    } else {
      // Selling in base loose unit (e.g. Loose Pcs)
      copy[idx] = {
        ...it,
        unit: it.base_unit || 'Pcs',
        conversion_factor: 1.0,
        unit_price: it.base_selling_price || it.unit_price || 0
      };
    }
    setItems(copy);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        product_id: '',
        name: '',
        sku: '',
        unit: 'Pcs',
        base_unit: 'Pcs',
        conversion_factor: 1.0,
        quantity: 1,
        unit_price: 0,
        base_selling_price: 0,
        package_unit: '',
        package_qty: 1,
        package_selling_price: 0,
        gst_rate: 18,
        discount_type: 'percentage',
        discount_value: 0,
        batch_number: '',
        expiry_date: '',
        part_number: ''
      }
    ]);
  };

  const removeItem = (idx) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleOpenCreate = () => {
    setEditingInvoice(null);
    setCustomer({
      name: '',
      phone: '',
      email: '',
      gstin: '',
      billing_address: '',
      state: business?.state || 'Maharashtra'
    });
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setInvoiceTime(getCurrentTimeStr());
    setDueDate('');
    setPaymentStatus('Paid');
    setAmountPaid('');
    setPaymentMode('Cash');
    setInvDiscountType('percentage');
    setInvDiscountValue(0);
    setNotes('');
    setItems([
      {
        product_id: '',
        name: '',
        sku: '',
        unit: 'Pcs',
        base_unit: 'Pcs',
        conversion_factor: 1.0,
        quantity: 1,
        unit_price: 0,
        base_selling_price: 0,
        package_unit: '',
        package_qty: 1,
        package_selling_price: 0,
        gst_rate: 18,
        discount_type: 'percentage',
        discount_value: 0,
        batch_number: '',
        expiry_date: '',
        part_number: ''
      }
    ]);
    setShowCreatorModal(true);
  };

  const handleOpenEdit = (inv) => {
    setEditingInvoice(inv);
    setCustomer({
      name: inv.customer?.name || '',
      phone: inv.customer?.phone || '',
      email: inv.customer?.email || '',
      gstin: inv.customer?.gstin || '',
      billing_address: inv.customer?.billing_address || '',
      state: inv.customer?.state || business?.state || 'Maharashtra'
    });
    setInvoiceDate(inv.invoice_date || new Date().toISOString().split('T')[0]);
    setInvoiceTime(inv.invoice_time || getCurrentTimeStr());
    setDueDate(inv.due_date || '');
    setPaymentStatus(inv.payment_status || 'Paid');
    setAmountPaid(inv.amount_paid || '');
    setPaymentMode(inv.payment_mode || 'Cash');
    setInvDiscountType(inv.invoice_discount_type || 'percentage');
    setInvDiscountValue(inv.invoice_discount_value || 0);
    setNotes(inv.notes || '');
    setItems(
      (inv.items || []).map((it) => ({
        product_id: it.product_id || '',
        name: it.name || '',
        sku: it.sku || '',
        unit: it.unit || 'Pcs',
        base_unit: it.base_unit || it.unit || 'Pcs',
        conversion_factor: it.conversion_factor || 1.0,
        quantity: it.quantity || 1,
        unit_price: it.unit_price || 0,
        base_selling_price: it.unit_price || 0,
        package_unit: '',
        package_qty: 1,
        package_selling_price: 0,
        gst_rate: it.gst_rate ?? 18,
        discount_type: it.discount_type || 'percentage',
        discount_value: it.discount_value || 0,
        batch_number: it.batch_number || '',
        expiry_date: it.expiry_date || '',
        part_number: it.part_number || ''
      }))
    );
    setSelectedInvoice(null);
    setShowCreatorModal(true);
  };

  const handlePrint = (inv) => {
    if (!inv) return;
    setPrintInvoice(inv);
    printInvoiceViaIframe(inv, business);
  };

  const handleDownloadPDF = async (inv) => {
    if (!inv || !inv.id) {
      showToast('Invoice ID is missing', 'error');
      return;
    }
    try {
      showToast(`Downloading PDF for ${inv.invoice_number}...`, 'info', 2000);
      const res = await apiFetch(`/api/invoices/${inv.id}/pdf?download=true`);
      if (!res.ok) {
        throw new Error('Failed to generate PDF from server');
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${inv.invoice_number || 'invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      }, 500);
      showToast(`✓ Invoice ${inv.invoice_number} PDF downloaded!`, 'success');
    } catch (err) {
      console.error('PDF download error:', err);
      window.open(`/api/invoices/${inv.id}/pdf?download=true`, '_blank');
      showToast('Opening PDF in new tab...', 'info');
    }
  };

  const handlePrintDraft = () => {
    if (!customer.name.trim()) {
      showToast('Please enter customer name to print invoice draft', 'warning');
      return;
    }
    const draftInv = {
      invoice_number: editingInvoice ? editingInvoice.invoice_number : 'DRAFT / PREVIEW',
      invoice_date: invoiceDate,
      invoice_time: invoiceTime,
      customer: {
        ...customer,
        name: customer.name || 'Walk-in Customer'
      },
      items: (calculation?.processed_items && calculation.processed_items.length > 0)
        ? calculation.processed_items
        : items.filter((it) => it.name),
      subtotal_gross: calculation?.subtotal_gross || 0,
      total_line_discounts: calculation?.total_line_discounts || 0,
      invoice_discount_amount: calculation?.invoice_discount_amount || 0,
      total_net_taxable: calculation?.total_net_taxable || 0,
      total_cgst: calculation?.total_cgst || 0,
      total_sgst: calculation?.total_sgst || 0,
      total_igst: calculation?.total_igst || 0,
      total_tax: calculation?.total_tax || 0,
      final_payable_amount: calculation?.final_payable_amount || 0,
      payment_status: paymentStatus,
      payment_mode: paymentMode,
      is_interstate: calculation?.is_interstate || false,
      notes: notes,
      seller_snapshot: business
    };
    handlePrint(draftInv);
  };

  const handleDeleteInvoice = async (inv) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${inv.invoice_number}? Items will be safely returned to stock.`)) {
      return;
    }
    try {
      const res = await apiFetch(`/api/invoices/${inv.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to delete invoice');
      showToast(data.message || `Invoice ${inv.invoice_number} deleted and stock returned.`, 'success');
      loadInvoices();
      loadProducts();
      if (selectedInvoice && selectedInvoice.id === inv.id) {
        setSelectedInvoice(null);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Submit Invoice Creation & SMS
  const handleCreateInvoice = async (e, shouldPrint = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!customer.name.trim()) {
      showToast('Please enter customer name.', 'error');
      return;
    }
    const validItems = items
      .filter((it) => it.name && it.name.trim().length > 0)
      .map((it) => ({
        product_id: it.product_id || '',
        name: it.name.trim(),
        sku: it.sku || '',
        unit: it.unit || 'Pcs',
        conversion_factor: parseFloat(it.conversion_factor) || 1.0,
        base_unit: it.base_unit || it.unit || 'Pcs',
        quantity: it.quantity === '' ? 1 : parseFloat(it.quantity) || 0,
        unit_price: it.unit_price === '' ? 0 : parseFloat(it.unit_price) || 0,
        gst_rate: it.gst_rate === '' ? 0 : parseFloat(it.gst_rate) || 0,
        discount_type: it.discount_type || 'percentage',
        discount_value: it.discount_value === '' ? 0 : parseFloat(it.discount_value) || 0,
        batch_number: it.batch_number || '',
        expiry_date: it.expiry_date || '',
        part_number: it.part_number || ''
      }))
      .filter((it) => it.quantity > 0);

    if (validItems.length === 0) {
      showToast('Please add at least one line item with valid name and quantity.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customer: {
          name: customer.name.trim(),
          phone: customer.phone ? customer.phone.trim() : '',
          email: customer.email ? customer.email.trim() : '',
          gstin: customer.gstin ? customer.gstin.trim().toUpperCase() : '',
          billing_address: customer.billing_address ? customer.billing_address.trim() : '',
          state: customer.state || business?.state || 'Maharashtra'
        },
        items: validItems,
        invoice_date: invoiceDate,
        invoice_time: invoiceTime,
        due_date: dueDate,
        invoice_level_discount_type: invDiscountType,
        invoice_level_discount_value: invDiscountValue === '' ? 0 : parseFloat(invDiscountValue) || 0,
        payment_status: paymentStatus,
        amount_paid: paymentStatus === 'Partially Paid' ? parseFloat(amountPaid) || 0 : undefined,
        payment_mode: paymentMode,
        notes,
        send_sms: sendSMSOnCreate && !!customer.phone,
        sms_message: smsNotificationMsg || undefined
      };

      const url = editingInvoice ? `/api/invoices/${editingInvoice.id}` : '/api/invoices';
      const method = editingInvoice ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Failed to save invoice');
      }

      showToast(
        editingInvoice
          ? `Invoice ${editingInvoice.invoice_number} updated successfully!`
          : `Invoice ${data.invoice_number} created successfully!`,
        'success'
      );

      if (data.sms) {
        if (!data.sms.success) {
          showToast(`⚠️ SMS warning: ${data.sms.message || 'Could not dispatch to phone'}`, 'warning', 6000);
        } else if (data.sms.mode === 'demo') {
          showToast(`[Demo Mode] SMS simulation recorded for ${customer.phone}`, 'info', 4000);
        } else {
          showToast(`✓ Invoice SMS dispatched to ${customer.phone} via TextBee!`, 'success', 5000);
        }
      }

      // If user clicked "Issue & Print", immediately print invoice
      if (shouldPrint) {
        const fullInv = {
          ...payload,
          id: data.id,
          invoice_number: data.invoice_number || (editingInvoice ? editingInvoice.invoice_number : 'INV-NEW'),
          items: (calculation?.processed_items && calculation.processed_items.length > 0) ? calculation.processed_items : validItems,
          subtotal_gross: calculation?.subtotal_gross || 0,
          total_line_discounts: calculation?.total_line_discounts || 0,
          invoice_discount_amount: calculation?.invoice_discount_amount || 0,
          total_net_taxable: calculation?.total_net_taxable || 0,
          total_cgst: calculation?.total_cgst || 0,
          total_sgst: calculation?.total_sgst || 0,
          total_igst: calculation?.total_igst || 0,
          total_tax: calculation?.total_tax || 0,
          final_payable_amount: data.final_payable_amount || calculation?.final_payable_amount || 0,
          payment_status: paymentStatus,
          payment_mode: paymentMode,
          seller_snapshot: business
        };
        printInvoiceViaIframe(fullInv, business);
      }

      // Reset
      setShowCreatorModal(false);
      setCustomer({
        name: '',
        phone: '',
        email: '',
        gstin: '',
        billing_address: '',
        state: business?.state || 'Maharashtra'
      });
      setItems([
        {
          product_id: '',
          name: '',
          sku: '',
          unit: 'Pcs',
          quantity: 1,
          unit_price: 0,
          gst_rate: 18,
          discount_type: 'percentage',
          discount_value: 0,
          batch_number: '',
          expiry_date: '',
          part_number: ''
        }
      ]);
      loadInvoices();
      loadProducts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Payment status updater
  const handleUpdatePaymentStatus = async (invId, newStatus) => {
    try {
      const res = await apiFetch(`/api/invoices/${invId}/payment-status`, {
        method: 'PUT',
        body: JSON.stringify({ payment_status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Update failed');
      showToast(data.message, 'success');
      loadInvoices();
      if (selectedInvoice && selectedInvoice.id === invId) {
        setSelectedInvoice({ ...selectedInvoice, payment_status: newStatus });
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const generateSMSMessageForInvoice = (inv) => {
    if (!inv) return '';
    const bName = business?.business_name || inv.seller_snapshot?.business_name || 'Akhtar Enterprises';
    const cName = inv.customer?.name || 'Customer';
    const itemsList = (inv.items || [])
      .map((it) => `- ${it.name} (${it.quantity} ${it.unit || 'Pcs'} @ Rs.${Number(it.unit_price || 0).toFixed(2)}) = Rs.${Number(it.line_total || 0).toFixed(2)}`)
      .join('\n');

    const totalDisc = (Number(inv.total_line_discounts || 0) + Number(inv.invoice_discount_amount || 0));
    const isInter = inv.is_interstate;
    const taxStr = isInter
      ? `IGST Tax: Rs.${Number(inv.total_igst || 0).toFixed(2)}`
      : `GST Tax (CGST+SGST): Rs.${Number(inv.total_tax || 0).toFixed(2)}`;

    const lines = [
      `Tax Invoice: ${inv.invoice_number}`,
      `From: ${bName}`,
      `Customer: ${cName}`,
      '',
      itemsList ? `Items:\n${itemsList}\n` : '',
      `Subtotal (Excl Tax): Rs.${Number(inv.subtotal_gross || 0).toFixed(2)}`,
      totalDisc > 0 ? `Discount: -Rs.${totalDisc.toFixed(2)}` : null,
      `Taxable Value: Rs.${Number(inv.total_net_taxable || 0).toFixed(2)}`,
      taxStr,
      `Total Payable (Incl Tax): Rs.${Number(inv.final_payable_amount || 0).toFixed(2)}`,
      `Status: ${inv.payment_status || 'Paid'}`,
      `Thank you for your business!`
    ].filter((l) => l !== null && l !== undefined);

    return lines.join('\n');
  };

  // SMS Modal Dispatch
  const openSMSModalFor = (inv) => {
    setSmsTargetInvoice(inv);
    setSmsPhone(inv.customer?.phone || '');
    setSmsCustomMsg(generateSMSMessageForInvoice(inv));
    setShowSMSModal(true);
  };

  const handleSendSMS = async (e) => {
    e.preventDefault();
    if (!smsPhone.trim()) {
      showToast('Please enter a valid phone number', 'error');
      return;
    }
    setIsSendingSMS(true);
    try {
      const res = await apiFetch('/api/sms/send', {
        method: 'POST',
        body: JSON.stringify({
          invoice_id: smsTargetInvoice.id,
          phone_number: smsPhone,
          custom_message: smsCustomMsg
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'SMS dispatch failed');

      if (!data.success) {
        showToast(data.message || 'SMS dispatch failed', 'error');
        return;
      }

      if (data.mode === 'demo') {
        showToast(`[Demo Mode] Simulated SMS dispatched for ${smsPhone}`, 'info', 4500);
      } else {
        showToast(data.message || 'SMS dispatched successfully via TextBee gateway!', 'success');
      }
      setShowSMSModal(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSendingSMS(false);
    }
  };

  // Save Settings Modal
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to save');
      showToast(data.message, 'success');
      refreshBusiness();
      setShowSettingsModal(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div>
      {/* Top Banner / Actions Bar */}
      <div className="ledger-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          {/* Search box */}
          <div style={{ display: 'flex', gap: '8px', flex: '1', minWidth: '280px' }}>
            <input
              type="text"
              placeholder="Search invoice number, customer name, phone, or GSTIN..."
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadInvoices()}
            />
            <button onClick={loadInvoices} className="btn btn-secondary">
              Search
            </button>
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  loadInvoices();
                }}
                className="btn btn-ghost"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Filter & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="all">All Payment Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partially Paid">Partially Paid</option>
            </select>

            <button onClick={handleOpenCreate} className="btn btn-primary">
              <span>+</span> Create New Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Ledger Table */}
      <div className="ledger-table-container">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Customer</th>
              <th>Issue Date & Time</th>
              <th>Supply State</th>
              <th style={{ textAlign: 'right' }}>Taxable Value</th>
              <th style={{ textAlign: 'right' }}>Total Amount</th>
              <th style={{ textAlign: 'center' }}>Payment Status</th>
              <th className="table-sticky-actions" style={{ textAlign: 'right', minWidth: '220px' }}>Quick Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)' }}>
                  Loading invoices from database...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--color-muted)' }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-forest)', marginBottom: '6px' }}>
                    No Invoices Generated Yet
                  </div>
                  <div style={{ fontSize: '12.5px', marginBottom: '16px' }}>
                    Click <b>"+ Create New Invoice"</b> above to issue your first GST bill with automatic tax calculation and stock deduction.
                  </div>
                  <button onClick={handleOpenCreate} className="btn btn-primary">
                    + Create First Invoice
                  </button>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-forest)' }}>
                    {inv.invoice_number}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>{inv.customer?.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                      {inv.customer?.phone && <span>{inv.customer.phone} • </span>}
                      {inv.customer?.gstin ? <span>GSTIN: {inv.customer.gstin}</span> : <span>Unregistered</span>}
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>{inv.invoice_date}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{inv.invoice_time || '—'}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '11.5px', fontWeight: 500 }}>
                      {inv.customer?.state || 'Local'}
                      <div style={{ fontSize: '10px', color: 'var(--color-muted)' }}>
                        {inv.is_interstate ? 'IGST (Inter-State)' : 'CGST+SGST (Intra-State)'}
                      </div>
                    </span>
                  </td>
                  <td className="tabular-nums" style={{ textAlign: 'right' }}>
                    ₹{inv.total_net_taxable.toFixed(2)}
                  </td>
                  <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-forest)' }}>
                    ₹{inv.final_payable_amount.toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <select
                      className={`status-pill ${
                        inv.payment_status === 'Paid'
                          ? 'status-paid'
                          : inv.payment_status === 'Partially Paid'
                          ? 'status-partial'
                          : 'status-unpaid'
                      }`}
                      value={inv.payment_status}
                      onChange={(e) => handleUpdatePaymentStatus(inv.id, e.target.value)}
                      style={{ cursor: 'pointer', outline: 'none' }}
                    >
                      <option value="Paid">Paid</option>
                      <option value="Unpaid">Unpaid</option>
                      <option value="Partially Paid">Partially Paid</option>
                    </select>
                  </td>
                  <td className="table-sticky-actions" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => handleDownloadPDF(inv)}
                        className="btn btn-copper btn-xs"
                        title="Download Printable PDF"
                      >
                        📄 PDF
                      </button>
                      <button
                        onClick={() => handlePrint(inv)}
                        className="btn btn-secondary btn-xs"
                        title="Print Tax Invoice / Receipt"
                      >
                        🖨️ Print
                      </button>
                      <button
                        onClick={() => openSMSModalFor(inv)}
                        className="btn btn-secondary btn-xs"
                        title="Send TextBee SMS"
                      >
                        💬 SMS
                      </button>
                      <button
                        onClick={() => handleOpenEdit(inv)}
                        className="btn btn-secondary btn-xs"
                        title="Edit Invoice"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="btn btn-ghost btn-xs"
                        title="View Details"
                      >
                        👁️ View
                      </button>
                      <button
                        onClick={() => handleDeleteInvoice(inv)}
                        className="btn btn-danger-subtle btn-xs"
                        style={{ fontWeight: 700 }}
                        title="Delete Invoice and Return Stock"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ====================================================================
          MODAL: MODERN INVOICE CREATOR & LIVE PREVIEW
          ==================================================================== */}
      {showCreatorModal && (
        <div className="modal-backdrop">
          <div className="modal-sheet" style={{ maxWidth: '1150px', width: '95vw', maxHeight: '90vh', height: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'var(--color-forest)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px' }}>
                  INV
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--color-forest)' }}>
                    {editingInvoice ? `Edit Invoice: ${editingInvoice.invoice_number}` : 'New GST Tax Invoice'}
                  </h3>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                    {editingInvoice ? 'Adjust line items or payments. Inventory stock differences will update automatically.' : 'Fill details below. Stock will be verified and deducted automatically.'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handlePrintDraft}
                  className="btn btn-secondary btn-sm"
                  title="Print live invoice draft"
                >
                  🖨️ Print Draft
                </button>
                <button onClick={() => setShowCreatorModal(false)} className="btn btn-ghost btn-sm" style={{ fontSize: '16px' }}>
                  ✕
                </button>
              </div>
            </div>

            <div className="modal-body invoice-creator-body">
              {/* Left Column: Form Fields */}
              <form id="invoice-create-form" onSubmit={handleCreateInvoice}>
                {/* 1. Customer Card */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--color-stone)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-forest)', textTransform: 'uppercase', marginBottom: '12px' }}>
                    1. Customer Information
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Customer Name *</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="e.g. Anand Trading or Cash Customer"
                        value={customer.name}
                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Customer Phone (SMS) *</label>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder="10-digit mobile number"
                        value={customer.phone}
                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Customer GSTIN (Optional)</label>
                      <input
                        type="text"
                        maxLength={15}
                        className="form-input"
                        placeholder="15-digit GSTIN"
                        value={customer.gstin}
                        onChange={(e) => setCustomer({ ...customer, gstin: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">State (Place of Supply) *</label>
                      <select
                        className="form-select"
                        value={customer.state}
                        onChange={(e) => setCustomer({ ...customer, state: e.target.value })}
                      >
                        <option value="Maharashtra">Maharashtra (Intra-state CGST+SGST)</option>
                        <option value="Delhi">Delhi (Inter-state IGST)</option>
                        <option value="Gujarat">Gujarat (Inter-state IGST)</option>
                        <option value="Karnataka">Karnataka (Inter-state IGST)</option>
                        <option value="Tamil Nadu">Tamil Nadu (Inter-state IGST)</option>
                        <option value="Uttar Pradesh">Uttar Pradesh (Inter-state IGST)</option>
                        <option value="Punjab">Punjab (Inter-state IGST)</option>
                        <option value="Rajasthan">Rajasthan (Inter-state IGST)</option>
                        <option value="West Bengal">West Bengal (Inter-state IGST)</option>
                        <option value="Other">Other State (IGST)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Billing Address</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Shop/Office address"
                      value={customer.billing_address}
                      onChange={(e) => setCustomer({ ...customer, billing_address: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Invoice Date *</label>
                      <input
                        type="date"
                        required
                        className="form-input"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Invoice Time *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={invoiceTime}
                        onChange={(e) => setInvoiceTime(e.target.value)}
                        placeholder="e.g. 03:45 PM"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Line Items Card */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--color-stone)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-forest)', textTransform: 'uppercase' }}>
                      2. Invoice Items
                    </div>
                    <button type="button" onClick={addItem} className="btn btn-secondary btn-sm">
                      + Add Item
                    </button>
                  </div>

                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        backgroundColor: 'var(--color-stone-light)',
                        borderRadius: '6px',
                        marginBottom: '10px',
                        border: '1px solid var(--color-stone)'
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'flex-start' }}>
                        <div>
                          <select
                            className="form-select"
                            value={it.product_id}
                            onChange={(e) => handleSelectProduct(idx, e.target.value)}
                            style={{ marginBottom: '4px', fontSize: '12px' }}
                          >
                            <option value="">-- Choose from Inventory or Type --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (Stock: {p.stock_qty} {p.unit}{p.package_unit ? ` | ${p.package_unit} of ${p.package_qty}` : ''} | ₹{p.selling_price})
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            required
                            placeholder="Item description *"
                            className="form-input"
                            value={it.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '10px' }}>Quantity</label>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            required
                            className="form-input"
                            value={it.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          />
                          {it.package_unit && it.package_qty > 1 ? (
                            <div style={{ fontSize: '10px', color: 'var(--color-forest)', fontWeight: 600, marginTop: '2px' }}>
                              {it.unit === it.package_unit ? (
                                <span>📦 = {(Number(it.quantity || 0) * Number(it.package_qty || 1)).toFixed(1).replace(/\.0$/, '')} {it.base_unit || 'Pcs'} stock deducted</span>
                              ) : (
                                <span>📦 = {Number(it.quantity || 0)} loose {it.base_unit || 'Pcs'} stock deducted</span>
                              )}
                            </div>
                          ) : null}
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '10px' }}>Selling Unit</label>
                          {it.package_unit && it.package_qty > 1 ? (
                            <select
                              className="form-select"
                              value={it.unit === it.package_unit ? 'package' : 'base'}
                              onChange={(e) => handleUnitChange(idx, e.target.value)}
                              style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-forest)' }}
                            >
                              <option value="base">
                                {it.base_unit || 'Pcs'} (Loose 1 Pc) — ₹{Number(it.base_selling_price || it.unit_price).toFixed(2)}
                              </option>
                              <option value="package">
                                {it.package_unit} (Full {it.package_qty} {it.base_unit || 'Pcs'}) — ₹{Number(it.package_selling_price || (Number(it.base_selling_price) * it.package_qty)).toFixed(2)}
                              </option>
                            </select>
                          ) : (
                            <select
                              className="form-select"
                              value={it.unit}
                              onChange={(e) => handleUnitChange(idx, e.target.value)}
                              style={{ fontSize: '11px' }}
                            >
                              <option value="Pcs">Pcs</option>
                              <option value="Box">Box</option>
                              <option value="Strip">Strip</option>
                              <option value="Kg">Kg</option>
                              <option value="Grams">Grams</option>
                              <option value="Pack">Pack</option>
                              <option value="Meter">Meter</option>
                              <option value="Litre">Litre</option>
                            </select>
                          )}
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '10px' }}>Rate / {it.unit || 'Unit'} (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            className="form-input"
                            value={it.unit_price}
                            onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                          />
                        </div>

                        <div style={{ paddingTop: '18px' }}>
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            disabled={items.length <= 1}
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#DC2626' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Line discount & GST slab */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '6px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '10px' }}>GST Slab</label>
                          <select
                            className="form-select"
                            value={it.gst_rate}
                            onChange={(e) => handleItemChange(idx, 'gst_rate', parseFloat(e.target.value))}
                          >
                            <option value={0}>0% (Exempt)</option>
                            <option value={5}>5% GST</option>
                            <option value={12}>12% GST</option>
                            <option value={18}>18% GST</option>
                            <option value={28}>28% GST</option>
                          </select>
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '10px' }}>Discount</label>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <select
                              className="form-select"
                              style={{ width: '55px', padding: '6px' }}
                              value={it.discount_type}
                              onChange={(e) => handleItemChange(idx, 'discount_type', e.target.value)}
                            >
                              <option value="percentage">%</option>
                              <option value="fixed">₹</option>
                            </select>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="form-input"
                              value={it.discount_value}
                              onChange={(e) => handleItemChange(idx, 'discount_value', e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '10px' }}>SKU / Batch</label>
                          <input
                            type="text"
                            placeholder="Optional code"
                            className="form-input"
                            value={it.sku || it.batch_number || ''}
                            onChange={(e) => handleItemChange(idx, 'sku', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 3. Invoice Discount, Terms & Direct SMS Toggle */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--color-stone)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-forest)', textTransform: 'uppercase', marginBottom: '12px' }}>
                    3. Payment & SMS Delivery
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Global Discount</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select
                          className="form-select"
                          style={{ width: '90px' }}
                          value={invDiscountType}
                          onChange={(e) => setInvDiscountType(e.target.value)}
                        >
                          <option value="percentage">% Flat</option>
                          <option value="fixed">₹ Amount</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-input"
                          value={invDiscountValue}
                          onChange={(e) => setInvDiscountValue(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Payment Status *</label>
                      <select
                        className="form-select"
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value)}
                      >
                        <option value="Paid">Paid in Full</option>
                        <option value="Unpaid">Unpaid / Due</option>
                        <option value="Partially Paid">Partially Paid</option>
                      </select>
                    </div>
                  </div>

                  {paymentStatus === 'Partially Paid' && (
                    <div className="form-group">
                      <label className="form-label">Advance Paid (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-input"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Clean SMS option */}
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="sms-auto-send"
                      checked={sendSMSOnCreate}
                      onChange={(e) => setSendSMSOnCreate(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-forest)', cursor: 'pointer' }}
                    />
                    <label htmlFor="sms-auto-send" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-charcoal)', cursor: 'pointer' }}>
                      Send invoice SMS notification to customer mobile
                    </label>
                  </div>
                </div>
              </form>

              {/* Right Column: Clean Modern Live Invoice Sheet */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--color-stone)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px'
                }}
              >
                <div>
                  {/* Header of Preview */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--color-forest)', paddingBottom: '14px', marginBottom: '14px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-forest)', margin: 0 }}>
                        {business?.business_name || 'My Business'}
                      </h3>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                        {business?.address || 'Business Address'}
                        <br />
                        <b>GSTIN:</b> {business?.gstin || '27AAAAA0000A1Z5'} | State: {business?.state || 'Maharashtra'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-forest)' }}>TAX INVOICE</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Date: {invoiceDate}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Time: {invoiceTime}</div>
                      <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <span className={`status-pill ${paymentStatus === 'Paid' ? 'status-paid' : paymentStatus === 'Partially Paid' ? 'status-partial' : 'status-unpaid'}`}>
                          {paymentStatus.toUpperCase()}
                        </span>
                        <button
                          type="button"
                          onClick={handlePrintDraft}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 8px', fontSize: '11px' }}
                          title="Print Live Invoice Draft / Receipt"
                        >
                          🖨️ Print
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Customer Block in Preview */}
                  <div style={{ backgroundColor: 'var(--color-stone-light)', padding: '10px', borderRadius: '4px', marginBottom: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                    <div>
                      <b style={{ color: 'var(--color-forest)' }}>BILLED TO:</b>
                      <div style={{ fontWeight: 700 }}>{customer.name || 'Walk-in Customer'}</div>
                      <div>{customer.billing_address || 'Address'}</div>
                      <div>Phone: {customer.phone || 'N/A'}</div>
                    </div>
                    <div>
                      <b style={{ color: 'var(--color-forest)' }}>SUPPLY TYPE:</b>
                      <div>Place: <b>{customer.state}</b></div>
                      <div>
                        {calculation?.is_interstate ? 'Inter-State (IGST 100%)' : 'Intra-State (CGST 50% + SGST 50%)'}
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-forest)', color: '#ffffff' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>#</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Qty</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Rate</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculation?.processed_items && calculation.processed_items.length > 0 ? (
                        calculation.processed_items.map((it, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--color-stone-light)' }}>
                            <td style={{ padding: '6px 8px' }}>{idx + 1}</td>
                            <td style={{ padding: '6px 8px' }}>
                              <b>{it.name}</b>
                              <span style={{ fontSize: '9px', color: 'var(--color-muted)', marginLeft: '6px' }}>({it.gst_rate}% GST)</span>
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{it.quantity} {it.unit}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{Number(it.unit_price || 0).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>₹{Number(it.line_total || 0).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--color-muted)' }}>
                            Add items on the left to see live calculations.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                {calculation && typeof calculation.subtotal_gross === 'number' && (
                  <div style={{ borderTop: '1px solid var(--color-stone)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '11px', color: 'var(--color-muted)' }}>
                      <span>Subtotal (Gross):</span>
                      <span>₹{Number(calculation.subtotal_gross || 0).toFixed(2)}</span>
                    </div>

                    {(Number(calculation.total_line_discounts || 0) > 0 || Number(calculation.invoice_discount_amount || 0) > 0) && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '11px', color: '#991B1B' }}>
                        <span>Total Discounts:</span>
                        <span>- ₹{(Number(calculation.total_line_discounts || 0) + Number(calculation.invoice_discount_amount || 0)).toFixed(2)}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '11px' }}>
                      <b>Taxable Value:</b>
                      <b>₹{Number(calculation.total_net_taxable || 0).toFixed(2)}</b>
                    </div>

                    {calculation.is_interstate ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '11px' }}>
                        <span>IGST:</span>
                        <span>₹{Number(calculation.total_igst || 0).toFixed(2)}</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '11px' }}>
                          <span>CGST (50%):</span>
                          <span>₹{Number(calculation.total_cgst || 0).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '11px' }}>
                          <span>SGST (50%):</span>
                          <span>₹{Number(calculation.total_sgst || 0).toFixed(2)}</span>
                        </div>
                      </>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px 0',
                        borderTop: '2px solid var(--color-forest)',
                        marginTop: '4px',
                        fontSize: '15px',
                        fontWeight: 800,
                        color: 'var(--color-forest)',
                        fontFamily: 'var(--font-heading)'
                      }}
                    >
                      <span>Final Payable:</span>
                      <span>₹{Number(calculation.final_payable_amount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ flexWrap: 'wrap', gap: '8px' }}>
              <button type="button" onClick={() => setShowCreatorModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePrintDraft}
                className="btn btn-secondary"
                title="Print draft without saving"
              >
                🖨️ Print Draft
              </button>
              <button
                type="button"
                onClick={(e) => handleCreateInvoice(e, true)}
                disabled={isSubmitting}
                className="btn btn-copper"
                style={{ fontWeight: 700 }}
                title="Save invoice, deduct stock, and print immediately"
              >
                {isSubmitting ? 'Saving...' : '🖨️ Save & Print'}
              </button>
              <button
                type="submit"
                form="invoice-create-form"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ padding: '8px 20px' }}
              >
                {isSubmitting ? 'Saving...' : editingInvoice ? '✓ Update Invoice' : '✓ Save Invoice Only'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: VIEW INVOICE DETAILS
          ==================================================================== */}
      {selectedInvoice && (
        <div className="modal-backdrop">
          <div className="modal-sheet modal-sheet-lg">
            <div className="modal-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--color-forest)' }}>
                Invoice {selectedInvoice.invoice_number}
              </h3>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  onClick={() => handleDownloadPDF(selectedInvoice)}
                  className="btn btn-copper btn-xs"
                  title="Download Printable PDF"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => handlePrint(selectedInvoice)}
                  className="btn btn-secondary btn-xs"
                  title="Print Tax Invoice / Bill"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={() => openSMSModalFor(selectedInvoice)}
                  className="btn btn-secondary btn-xs"
                >
                  💬 Send SMS
                </button>
                <button
                  onClick={() => handleOpenEdit(selectedInvoice)}
                  className="btn btn-secondary btn-xs"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDeleteInvoice(selectedInvoice)}
                  className="btn btn-danger-subtle btn-xs"
                  style={{ fontWeight: 700 }}
                >
                  🗑️ Delete
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="btn btn-ghost btn-xs">
                  ✕
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', fontSize: '12.5px' }}>
                <div>
                  <div style={{ color: 'var(--color-muted)' }}>Billed To:</div>
                  <b style={{ fontSize: '14px' }}>{selectedInvoice.customer?.name}</b>
                  <div>{selectedInvoice.customer?.billing_address}</div>
                  <div>Phone: {selectedInvoice.customer?.phone || 'N/A'}</div>
                  <div>State: {selectedInvoice.customer?.state}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--color-muted)', fontSize: '12px' }}>
                    <b>Issue Date & Time:</b> {selectedInvoice.invoice_date} {selectedInvoice.invoice_time ? `• ${selectedInvoice.invoice_time}` : ''}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-forest)', margin: '4px 0' }}>
                    ₹{selectedInvoice.final_payable_amount.toFixed(2)}
                  </div>
                  <div>Status: <b>{selectedInvoice.payment_status}</b></div>
                </div>
              </div>

              <table className="ledger-table" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Taxable</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td>
                        <b>{it.name}</b>
                        {it.sku && <span style={{ fontSize: '10px', color: 'var(--color-muted)', marginLeft: '6px' }}>({it.sku})</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>{it.quantity} {it.unit}</td>
                      <td style={{ textAlign: 'right' }}>₹{it.unit_price.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>₹{it.taxable_amount.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{it.line_total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedInvoice(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: TEXTBEE SMS DISPATCH
          ==================================================================== */}
      {showSMSModal && smsTargetInvoice && (
        <div className="modal-backdrop">
          <div className="modal-sheet" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '15px' }}>Send Invoice SMS</h3>
              <button onClick={() => setShowSMSModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>

            <form onSubmit={handleSendSMS}>
              <div className="modal-body">
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '12px' }}>
                  Dispatch notification for invoice <b>{smsTargetInvoice.invoice_number}</b> via TextBee Android Gateway.
                </div>

                <div className="form-group">
                  <label className="form-label">Recipient Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    className="form-input"
                    placeholder="10-digit mobile number"
                    value={smsPhone}
                    onChange={(e) => setSmsPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">SMS Message</label>
                  <textarea
                    rows={4}
                    className="form-textarea"
                    value={smsCustomMsg}
                    onChange={(e) => setSmsCustomMsg(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowSMSModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSendingSMS} className="btn btn-copper">
                  {isSendingSMS ? 'Dispatching...' : 'Confirm & Send SMS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: GST & SMS SETTINGS
          ==================================================================== */}
      {showSettingsModal && (
        <div className="modal-backdrop">
          <div className="modal-sheet modal-sheet-lg">
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '16px' }}>Business Profile & SMS Gateway Setup</h3>
              <button onClick={() => setShowSettingsModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>

            <form onSubmit={handleSaveSettings}>
              <div className="modal-body">
                {/* Business Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Business Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={settingsForm.business_name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, business_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">GSTIN *</label>
                    <input
                      type="text"
                      required
                      maxLength={15}
                      className="form-input"
                      value={settingsForm.gstin}
                      onChange={(e) => setSettingsForm({ ...settingsForm, gstin: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">State *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={settingsForm.state}
                      onChange={(e) => setSettingsForm({ ...settingsForm, state: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={settingsForm.phone}
                      onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Invoice Prefix</label>
                    <input
                      type="text"
                      className="form-input"
                      value={settingsForm.invoice_prefix}
                      onChange={(e) => setSettingsForm({ ...settingsForm, invoice_prefix: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>

                {/* TextBee Gateway Info */}
                <div style={{ borderTop: '1px solid var(--color-stone-light)', paddingTop: '14px', marginTop: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-forest)', marginBottom: '8px' }}>
                    TextBee Android SMS Gateway Integration
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '12px' }}>
                    Route SMS notifications directly through your connected Android phone using the TextBee app.
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">TextBee Device ID</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Device ID from TextBee Android app"
                        value={settingsForm.textbee_device_id}
                        onChange={(e) => setSettingsForm({ ...settingsForm, textbee_device_id: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">TextBee API Key</label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="API Key from TextBee"
                        value={settingsForm.textbee_api_key}
                        onChange={(e) => setSettingsForm({ ...settingsForm, textbee_api_key: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={settingsForm.textbee_demo_mode}
                        onChange={(e) => setSettingsForm({ ...settingsForm, textbee_demo_mode: e.target.checked })}
                      />
                      Enable Demo Simulation Mode (No physical Android phone required)
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowSettingsModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          PRINTABLE TAX INVOICE (Rendered only on window.print())
          ==================================================================== */}
      {printInvoice && (
        <div id="print-tax-invoice" className="print-sheet-area">
          {/* Header with Business Details */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #243C32', paddingBottom: '12px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#243C32', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                {printInvoice.seller_snapshot?.business_name || business?.business_name || 'Akhtar Enterprises'}
              </h2>
              <div style={{ fontSize: '11.5px', color: '#444444', marginTop: '3px' }}>
                {printInvoice.seller_snapshot?.address || business?.address || 'Main Market Road'}
              </div>
              <div style={{ fontSize: '11px', color: '#444444' }}>
                <b>GSTIN:</b> {printInvoice.seller_snapshot?.gstin || business?.gstin || '27AAAAA0000A1Z5'}
                {(printInvoice.seller_snapshot?.phone || business?.phone) && (
                  <span> • <b>Tel:</b> {printInvoice.seller_snapshot?.phone || business?.phone}</span>
                )}
                {(printInvoice.seller_snapshot?.email || business?.email) && (
                  <span> • <b>Email:</b> {printInvoice.seller_snapshot?.email || business?.email}</span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#444444' }}>
                <b>State:</b> {printInvoice.seller_snapshot?.state || business?.state || 'Maharashtra'}
              </div>
            </div>

            <div style={{ textAlign: 'right', minWidth: '180px' }}>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#243C32', letterSpacing: '0.05em' }}>
                TAX INVOICE
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                <b>Invoice No:</b> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{printInvoice.invoice_number}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#555555' }}>
                <b>Date:</b> {printInvoice.invoice_date}
              </div>
              <div style={{ fontSize: '12px', color: '#555555' }}>
                <b>Time:</b> {printInvoice.invoice_time || getCurrentTimeStr()}
              </div>
              {printInvoice.due_date && (
                <div style={{ fontSize: '11.5px', color: '#555555' }}>
                  <b>Due Date:</b> {printInvoice.due_date}
                </div>
              )}
              <div style={{ marginTop: '4px', fontSize: '12px' }}>
                <b>Payment:</b> <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{printInvoice.payment_status}</span> ({printInvoice.payment_mode || 'Cash'})
              </div>
            </div>
          </div>

          {/* Billed To / Place of Supply */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', border: '1px solid #D8D0C2', borderRadius: '4px', padding: '10px 14px', marginBottom: '16px', backgroundColor: '#FAFAFA' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#243C32', textTransform: 'uppercase' }}>BILLED TO:</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111111' }}>{printInvoice.customer?.name}</div>
              {printInvoice.customer?.billing_address && (
                <div style={{ fontSize: '11.5px', color: '#444444' }}>{printInvoice.customer.billing_address}</div>
              )}
              <div style={{ fontSize: '11.5px', color: '#444444' }}>
                <b>Phone:</b> {printInvoice.customer?.phone || 'N/A'}
                {printInvoice.customer?.email && <span> • <b>Email:</b> {printInvoice.customer.email}</span>}
              </div>
              <div style={{ fontSize: '11.5px', color: '#444444' }}>
                <b>GSTIN:</b> {printInvoice.customer?.gstin ? printInvoice.customer.gstin : 'Unregistered Consumer'}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#243C32', textTransform: 'uppercase' }}>PLACE OF SUPPLY:</div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>{printInvoice.customer?.state || business?.state || 'Maharashtra'}</div>
              <div style={{ fontSize: '11.5px', color: '#555555', marginTop: '2px' }}>
                Supply Nature: <b>{printInvoice.is_interstate ? 'Inter-State (IGST 100%)' : 'Intra-State (CGST 50% + SGST 50%)'}</b>
              </div>
              <div style={{ fontSize: '11.5px', color: '#555555' }}>
                Reverse Charge: <b>No</b>
              </div>
            </div>
          </div>

          {/* Table of items */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#243C32', color: '#FFFFFF', textAlign: 'left' }}>
                <th style={{ padding: '7px 8px', border: '1px solid #243C32', width: '30px' }}>#</th>
                <th style={{ padding: '7px 8px', border: '1px solid #243C32' }}>Item Description</th>
                <th style={{ padding: '7px 8px', border: '1px solid #243C32', textAlign: 'right', width: '70px' }}>Qty</th>
                <th style={{ padding: '7px 8px', border: '1px solid #243C32', textAlign: 'right', width: '80px' }}>Unit Rate</th>
                <th style={{ padding: '7px 8px', border: '1px solid #243C32', textAlign: 'right', width: '70px' }}>Disc.</th>
                <th style={{ padding: '7px 8px', border: '1px solid #243C32', textAlign: 'right', width: '80px' }}>Taxable</th>
                <th style={{ padding: '7px 8px', border: '1px solid #243C32', textAlign: 'center', width: '60px' }}>GST %</th>
                <th style={{ padding: '7px 8px', border: '1px solid #243C32', textAlign: 'right', width: '85px' }}>Tax (₹)</th>
                <th style={{ padding: '7px 8px', border: '1px solid #243C32', textAlign: 'right', width: '90px' }}>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {printInvoice.items?.map((it, idx) => {
                const itTax = Number(it.tax_amount ?? ((it.cgst_amount || 0) + (it.sgst_amount || 0) + (it.igst_amount || 0)));
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #D8D0C2' }}>
                    <td style={{ padding: '6px 8px', border: '1px solid #E5E0D8' }}>{idx + 1}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #E5E0D8' }}>
                      <div style={{ fontWeight: 700, color: '#111111' }}>{it.name}</div>
                      {it.sku && <div style={{ fontSize: '9.5px', color: '#666666' }}>SKU: {it.sku}</div>}
                    </td>
                    <td style={{ padding: '6px 8px', border: '1px solid #E5E0D8', textAlign: 'right' }}>
                      {it.quantity} {it.unit || 'Pcs'}
                    </td>
                    <td style={{ padding: '6px 8px', border: '1px solid #E5E0D8', textAlign: 'right' }}>
                      ₹{Number(it.unit_price || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 8px', border: '1px solid #E5E0D8', textAlign: 'right', color: '#991B1B' }}>
                      {Number(it.discount_amount || 0) > 0 ? `₹${Number(it.discount_amount).toFixed(2)}` : '-'}
                    </td>
                    <td style={{ padding: '6px 8px', border: '1px solid #E5E0D8', textAlign: 'right' }}>
                      ₹{Number(it.taxable_amount || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 8px', border: '1px solid #E5E0D8', textAlign: 'center' }}>
                      {it.gst_rate ?? 18}%
                    </td>
                    <td style={{ padding: '6px 8px', border: '1px solid #E5E0D8', textAlign: 'right' }}>
                      ₹{itTax.toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 8px', border: '1px solid #E5E0D8', textAlign: 'right', fontWeight: 800 }}>
                      ₹{Number(it.line_total || 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Bottom summary and bank details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'flex-start' }}>
            {/* Left: Bank details & Notes */}
            <div>
              <div style={{ border: '1px solid #D8D0C2', borderRadius: '4px', padding: '10px 12px', marginBottom: '10px', fontSize: '11px', backgroundColor: '#FAFAFA' }}>
                <div style={{ fontWeight: 800, color: '#243C32', textTransform: 'uppercase', marginBottom: '4px' }}>Bank & Payment Details:</div>
                <div><b>Bank:</b> {printInvoice.seller_snapshot?.bank_name || business?.bank_name || 'State Bank of India'}</div>
                <div><b>A/C No:</b> {printInvoice.seller_snapshot?.bank_account_no || business?.bank_account_no || 'Not Configured'}</div>
                <div><b>IFSC Code:</b> {printInvoice.seller_snapshot?.bank_ifsc || business?.bank_ifsc || 'SBIN0001234'}</div>
                <div><b>UPI ID:</b> {printInvoice.seller_snapshot?.upi_id || business?.upi_id || 'akhtar@upi'}</div>
              </div>

              {printInvoice.notes && (
                <div style={{ fontSize: '10.5px', color: '#555555', fontStyle: 'italic', marginBottom: '8px' }}>
                  <b>Notes:</b> {printInvoice.notes}
                </div>
              )}

              <div style={{ fontSize: '10px', color: '#666666', borderTop: '1px dashed #D8D0C2', paddingTop: '6px' }}>
                <b>Terms & Conditions:</b> {printInvoice.seller_snapshot?.terms_conditions || business?.terms_conditions || '1. Goods once sold are not returnable. 2. Interest @ 18% p.a. charged after due date.'}
              </div>
            </div>

            {/* Right: Calculations breakdown */}
            <div style={{ border: '1px solid #D8D0C2', borderRadius: '4px', overflow: 'hidden', fontSize: '11.5px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #E5E0D8' }}>
                    <td style={{ padding: '5px 10px', color: '#555555' }}>Subtotal (Gross):</td>
                    <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600 }}>₹{Number(printInvoice.subtotal_gross || 0).toFixed(2)}</td>
                  </tr>
                  {(Number(printInvoice.total_line_discounts || 0) > 0 || Number(printInvoice.invoice_discount_amount || 0) > 0) && (
                    <tr style={{ borderBottom: '1px solid #E5E0D8', color: '#991B1B' }}>
                      <td style={{ padding: '5px 10px' }}>Total Discounts:</td>
                      <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600 }}>
                        - ₹{(Number(printInvoice.total_line_discounts || 0) + Number(printInvoice.invoice_discount_amount || 0)).toFixed(2)}
                      </td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: '1px solid #E5E0D8', backgroundColor: '#F8F6F2' }}>
                    <td style={{ padding: '5px 10px', fontWeight: 700 }}>Taxable Value:</td>
                    <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 700 }}>₹{Number(printInvoice.total_net_taxable || 0).toFixed(2)}</td>
                  </tr>
                  {printInvoice.is_interstate ? (
                    <tr style={{ borderBottom: '1px solid #E5E0D8' }}>
                      <td style={{ padding: '5px 10px', color: '#555555' }}>Integrated GST (IGST):</td>
                      <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600 }}>₹{Number(printInvoice.total_igst || 0).toFixed(2)}</td>
                    </tr>
                  ) : (
                    <>
                      <tr style={{ borderBottom: '1px solid #E5E0D8' }}>
                        <td style={{ padding: '5px 10px', color: '#555555' }}>Central GST (CGST):</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600 }}>₹{Number(printInvoice.total_cgst || 0).toFixed(2)}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #E5E0D8' }}>
                        <td style={{ padding: '5px 10px', color: '#555555' }}>State GST (SGST):</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600 }}>₹{Number(printInvoice.total_sgst || 0).toFixed(2)}</td>
                      </tr>
                    </>
                  )}
                  <tr style={{ backgroundColor: '#243C32', color: '#FFFFFF', fontSize: '14px' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 800 }}>Final Payable Amount:</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900 }}>₹{Number(printInvoice.final_payable_amount || 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures & Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '28px', paddingTop: '10px', borderTop: '1px solid #D8D0C2' }}>
            <div style={{ fontSize: '10.5px', color: '#666666' }}>
              This is an authentic computer-generated tax invoice issued in accordance with Indian GST Rules.
            </div>

            <div style={{ textAlign: 'center', minWidth: '180px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#243C32' }}>
                For {printInvoice.seller_snapshot?.business_name || business?.business_name || 'Akhtar Enterprises'}
              </div>
              <div style={{ height: '40px' }}></div>
              <div style={{ borderTop: '1px solid #333333', fontSize: '11px', fontWeight: 600, paddingTop: '3px' }}>
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
