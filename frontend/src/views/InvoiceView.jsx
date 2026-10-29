import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

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

  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
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
      copy[idx] = {
        ...copy[idx],
        product_id: found.id,
        name: found.name,
        sku: found.sku,
        unit: found.unit || 'Pcs',
        base_unit: found.unit || 'Pcs',
        conversion_factor: 1.0,
        unit_price: found.selling_price || 0,
        base_selling_price: found.selling_price || 0,
        package_unit: found.package_unit || '',
        package_qty: found.package_qty || 1,
        package_selling_price: found.package_selling_price || 0,
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
    if (it.package_unit && newUnit === it.package_unit) {
      // Selling in packaging unit (e.g. Box of 10 Pcs)
      const pkgPrice = it.package_selling_price > 0 
        ? it.package_selling_price 
        : (Number(it.base_selling_price || it.unit_price) * (it.package_qty || 1.0));
      copy[idx] = {
        ...it,
        unit: newUnit,
        conversion_factor: it.package_qty || 1.0,
        unit_price: pkgPrice
      };
    } else if (newUnit === it.base_unit) {
      // Selling in base unit (e.g. Loose Pcs)
      copy[idx] = {
        ...it,
        unit: newUnit,
        conversion_factor: 1.0,
        unit_price: it.base_selling_price || it.unit_price || 0
      };
    } else {
      copy[idx] = {
        ...it,
        unit: newUnit
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
    setPrintInvoice(inv);
    setTimeout(() => {
      window.print();
    }, 180);
  };

  const handlePrintDraft = () => {
    if (!customer.name.trim()) {
      showToast('Please enter customer name to print invoice draft', 'warning');
      return;
    }
    const draftInv = {
      invoice_number: editingInvoice ? editingInvoice.invoice_number : 'DRAFT / PREVIEW',
      invoice_date: invoiceDate,
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
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
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

            {isAdmin && (
              <button onClick={() => setShowSettingsModal(true)} className="btn btn-secondary">
                ⚙️ GST & SMS Setup
              </button>
            )}

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
              <th>Issue Date</th>
              <th>Supply State</th>
              <th style={{ textAlign: 'right' }}>Taxable Value</th>
              <th style={{ textAlign: 'right' }}>Total Amount</th>
              <th style={{ textAlign: 'center' }}>Payment Status</th>
              <th style={{ textAlign: 'right' }}>Quick Actions</th>
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
                  <td style={{ color: 'var(--color-muted)' }}>{inv.invoice_date}</td>
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
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <a
                      href={`/api/invoices/${inv.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-copper btn-sm"
                      style={{ marginRight: '6px' }}
                      title="Download Printable PDF"
                    >
                      📄 PDF
                    </a>
                    <button
                      onClick={() => handlePrint(inv)}
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: '6px' }}
                      title="Print Tax Invoice / Receipt"
                    >
                      🖨️ Print
                    </button>
                    <button
                      onClick={() => openSMSModalFor(inv)}
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: '6px' }}
                      title="Send TextBee SMS"
                    >
                      💬 SMS
                    </button>
                    <button
                      onClick={() => handleOpenEdit(inv)}
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: '6px' }}
                      title="Edit Invoice"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="btn btn-ghost btn-sm"
                      style={{ marginRight: '6px' }}
                      title="View Details"
                    >
                      👁️ View
                    </button>
                    <button
                      onClick={() => handleDeleteInvoice(inv)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#DC2626', fontWeight: 600, border: '1px solid rgba(220,38,38,0.2)' }}
                      title="Delete Invoice and Return Stock"
                    >
                      🗑️ Delete
                    </button>
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
          <div className="modal-sheet" style={{ maxWidth: '1150px', width: '95vw', height: '90vh' }}>
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
              <button onClick={() => setShowCreatorModal(false)} className="btn btn-ghost btn-sm" style={{ fontSize: '16px' }}>
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', overflowY: 'auto' }}>
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
                          {it.conversion_factor && it.conversion_factor > 1 ? (
                            <div style={{ fontSize: '9.5px', color: 'var(--color-copper)', fontWeight: 600, marginTop: '2px' }}>
                              = {(Number(it.quantity || 0) * Number(it.conversion_factor || 1)).toFixed(2).replace(/\.00$/, '')} {it.base_unit || 'Pcs'} stock
                            </div>
                          ) : null}
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '10px' }}>Selling Unit</label>
                          {it.package_unit ? (
                            <select
                              className="form-select"
                              value={it.unit}
                              onChange={(e) => handleUnitChange(idx, e.target.value)}
                              style={{ fontSize: '11px' }}
                            >
                              <option value={it.base_unit || 'Pcs'}>{it.base_unit || 'Pcs'} (Single)</option>
                              <option value={it.package_unit}>{it.package_unit} ({it.package_qty} {it.base_unit || 'Pcs'})</option>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src="/logo.png"
                        alt="HisabKitab"
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1px solid var(--color-stone)'
                        }}
                      />
                      <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-forest)', margin: 0 }}>
                          {business?.business_name || 'My Business'}
                        </h3>
                        <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                          {business?.address || 'Business Address'}
                          <br />
                          <b>GSTIN:</b> {business?.gstin || '27AAAAA0000A1Z5'} | State: {business?.state || 'Maharashtra'}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-forest)' }}>TAX INVOICE</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Date: {invoiceDate}</div>
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

            <div className="modal-footer">
              <button type="button" onClick={() => setShowCreatorModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                form="invoice-create-form"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ padding: '10px 24px' }}
              >
                {isSubmitting ? 'Saving...' : editingInvoice ? '✓ Update Invoice & Recalculate' : '✓ Issue Invoice & Save'}
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
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--color-forest)' }}>
                Invoice {selectedInvoice.invoice_number}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={`/api/invoices/${selectedInvoice.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-copper btn-sm"
                >
                  Download PDF
                </a>
                <button
                  onClick={() => handlePrint(selectedInvoice)}
                  className="btn btn-secondary btn-sm"
                  title="Print Tax Invoice / Bill"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={() => openSMSModalFor(selectedInvoice)}
                  className="btn btn-secondary btn-sm"
                >
                  💬 Send SMS
                </button>
                <button
                  onClick={() => handleOpenEdit(selectedInvoice)}
                  className="btn btn-secondary btn-sm"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDeleteInvoice(selectedInvoice)}
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#DC2626' }}
                >
                  Delete
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="btn btn-ghost btn-sm">
                  ✕
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', fontSize: '12.5px' }}>
                <div>
                  <div style={{ color: 'var(--color-muted)' }}>Billed To:</div>
                  <b style={{ fontSize: '14px' }}>{selectedInvoice.customer?.name}</b>
                  <div>{selectedInvoice.customer?.billing_address}</div>
                  <div>Phone: {selectedInvoice.customer?.phone || 'N/A'}</div>
                  <div>State: {selectedInvoice.customer?.state}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--color-muted)' }}>Date: {selectedInvoice.invoice_date}</div>
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
          {/* Header with Business Details and Logo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #243C32', paddingBottom: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img
                src="/logo.png"
                alt="Logo"
                style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#243C32', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
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
            <div style={{ fontSize: '10px', color: '#666666' }}>
              This is a computer-generated tax invoice issued in accordance with GST Rules.
              <br />
              Software: <b>HisabKitab</b> — Billing, Inventory & Business Management
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
