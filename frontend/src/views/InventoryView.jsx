import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const InventoryView = () => {
  const { apiFetch, isAdmin, user, dataVersion, refreshData } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockQty, setRestockQty] = useState(10);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [stockLedger, setStockLedger] = useState([]);

  // Stock Inward & Security Workflow State
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [inwardProduct, setInwardProduct] = useState(null);
  const [inwardQty, setInwardQty] = useState('');
  const [inwardSupplier, setInwardSupplier] = useState('');
  const [inwardBillNo, setInwardBillNo] = useState('');
  const [inwardBillDate, setInwardBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [inwardCostPrice, setInwardCostPrice] = useState('');
  const [inwardAuditStatus, setInwardAuditStatus] = useState(null);
  const [inwardAuthType, setInwardAuthType] = useState('NORMAL');
  const [inwardOtp, setInwardOtp] = useState('');
  const [inwardDeclaration, setInwardDeclaration] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [inwardSubmitting, setInwardSubmitting] = useState(false);
  const [phoneHint, setPhoneHint] = useState('');
  const [inwardHasDiscrepancy, setInwardHasDiscrepancy] = useState(false);
  const [inwardBilledQty, setInwardBilledQty] = useState('');
  const [inwardStockistRemarks, setInwardStockistRemarks] = useState('');
  const [inwardHasGift, setInwardHasGift] = useState(false);
  const [inwardGiftName, setInwardGiftName] = useState('');
  const [inwardGiftQty, setInwardGiftQty] = useState('1');
  const [inwardGiftRef, setInwardGiftRef] = useState('');

  // Stockist Performance State
  const [stockistPerformance, setStockistPerformance] = useState([]);

  // New Product Inward Delivery & Promo Gift State
  const [newProdSupplier, setNewProdSupplier] = useState('');
  const [newProdBillNo, setNewProdBillNo] = useState('');
  const [newProdHasDiscrepancy, setNewProdHasDiscrepancy] = useState(false);
  const [newProdBilledQty, setNewProdBilledQty] = useState('');
  const [newProdStockistRemarks, setNewProdStockistRemarks] = useState('');
  const [newProdHasGift, setNewProdHasGift] = useState(false);
  const [newProdGiftName, setNewProdGiftName] = useState('');
  const [newProdGiftQty, setNewProdGiftQty] = useState('1');
  const [newProdGiftRef, setNewProdGiftRef] = useState('');

  // Stock Audit Tray Modal State
  const [showAuditTrayModal, setShowAuditTrayModal] = useState(false);
  const [auditTrayTab, setAuditTrayTab] = useState('INWARDS'); // 'INWARDS' | 'VENDOR_CLAIMS' | 'GIFT_VAULT'
  const [auditInwards, setAuditInwards] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState('all');
  const [selectedInwardForDiscrepancy, setSelectedInwardForDiscrepancy] = useState(null);
  const [discrepancyActualQty, setDiscrepancyActualQty] = useState('');
  const [discrepancyNotes, setDiscrepancyNotes] = useState('');
  const [selectedInwardForRecount, setSelectedInwardForRecount] = useState(null);
  const [recountCorrectedQty, setRecountCorrectedQty] = useState('');
  const [recountNotes, setRecountNotes] = useState('');

  // Vendor Debit Claims State
  const [vendorClaims, setVendorClaims] = useState([]);
  const [claimsSummary, setClaimsSummary] = useState({ pending_count: 0, pending_total: 0, settled_total: 0, total_claims_count: 0 });
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimFilter, setClaimFilter] = useState('all');
  const [selectedClaimForSettle, setSelectedClaimForSettle] = useState(null);
  const [settleType, setSettleType] = useState('DEDUCTED_FROM_BILL');
  const [settleRef, setSettleRef] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [settlingClaim, setSettlingClaim] = useState(false);

  // Promotional & Festival Gift Vault State
  const [promotionalGifts, setPromotionalGifts] = useState([]);
  const [giftsSummary, setGiftsSummary] = useState({ total_count: 0, pending_allocation_count: 0, active_schemes_count: 0, festival_vault_count: 0, store_assets_count: 0 });
  const [giftsLoading, setGiftsLoading] = useState(false);
  const [giftFilter, setGiftFilter] = useState('all');
  const [selectedGiftForAllocation, setSelectedGiftForAllocation] = useState(null);
  const [giftAllocType, setGiftAllocType] = useState('CUSTOMER_PROMO_SCHEME');
  const [giftMinQty, setGiftMinQty] = useState('2');
  const [giftTargetProdId, setGiftTargetProdId] = useState('');
  const [giftPersonName, setGiftPersonName] = useState('');
  const [giftContact, setGiftContact] = useState('');
  const [giftVaultNotes, setGiftVaultNotes] = useState('');
  const [giftSellingPrice, setGiftSellingPrice] = useState('');
  const [submittingAlloc, setSubmittingAlloc] = useState(false);
  const [selectedGiftForHandover, setSelectedGiftForHandover] = useState(null);
  const [handoverRecipient, setHandoverRecipient] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [submittingHandover, setSubmittingHandover] = useState(false);

  // In-App Alert and Audit Timeline State
  const [inwardAlerts, setInwardAlerts] = useState(null);
  const [selectedInwardForTimeline, setSelectedInwardForTimeline] = useState(null);
  const [selectedInwardForStatement, setSelectedInwardForStatement] = useState(null);
  const [stockistStatementInput, setStockistStatementInput] = useState('');
  const [submittingStatement, setSubmittingStatement] = useState(false);
  const [selectedInwardForDecision, setSelectedInwardForDecision] = useState(null);
  const [decisionActionType, setDecisionActionType] = useState('ACCEPT_EXPLANATION');
  const [decisionNotesInput, setDecisionNotesInput] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Form State
  const initialForm = {
    name: '',
    sku: '',
    category: 'Stationery',
    unit: 'Pcs',
    purchase_price: '',
    selling_price: '',
    stock_qty: 0,
    low_stock_threshold: 5,
    gst_rate: 18,
    package_unit: '',
    package_qty: 1,
    package_selling_price: '',
    batch_number: '',
    expiry_date: '',
    part_number: '',
    description: ''
  };
  const [formData, setFormData] = useState(initialForm);
  const [packagingMode, setPackagingMode] = useState('single'); // 'single' or 'multi'
  const [pkgUnit, setPkgUnit] = useState('Box');
  const [looseUnit, setLooseUnit] = useState('Pcs');
  const [pkgQty, setPkgQty] = useState(10);
  const [stockPackages, setStockPackages] = useState('');
  const [restockUnitType, setRestockUnitType] = useState('pkg');

  const loadProducts = async (forceSpinner = false) => {
    if (products.length === 0 || forceSpinner) {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter !== 'All') params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('status_filter', statusFilter);

      const res = await apiFetch(`/api/inventory?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      showToast('Error loading inventory products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadInwardAlerts = async () => {
    try {
      const res = await apiFetch('/api/inventory/inward/alerts');
      if (res.ok) {
        const data = await res.json();
        setInwardAlerts(data);
      }
    } catch (e) {
      console.error('Failed to load inward alerts:', e);
    }
  };

  useEffect(() => {
    loadProducts();
    loadInwardAlerts();
    loadVendorClaims('all');
    loadPromotionalGifts('all');
  }, [categoryFilter, statusFilter, dataVersion]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadProducts();
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData(initialForm);
    setPackagingMode('single');
    setPkgUnit('Box');
    setLooseUnit('Pcs');
    setPkgQty(10);
    setStockPackages('');
    setNewProdSupplier('');
    setNewProdBillNo('');
    setNewProdHasDiscrepancy(false);
    setNewProdBilledQty('');
    setNewProdStockistRemarks('');
    setNewProdHasGift(false);
    setNewProdGiftName('');
    setNewProdGiftQty('1');
    setNewProdGiftRef('');
    setShowProductModal(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    const isMulti = !!(p.package_unit && p.package_qty > 1);
    setPackagingMode(isMulti ? 'multi' : 'single');
    setPkgUnit(p.package_unit || 'Box');
    setLooseUnit(p.unit || 'Pcs');
    setPkgQty(p.package_qty || 10);
    setStockPackages(isMulti && p.package_qty ? (p.stock_qty / p.package_qty).toFixed(1).replace(/\.0$/, '') : '');
    setFormData({
      name: p.name || '',
      sku: p.sku || '',
      category: p.category || 'General Goods',
      unit: p.unit || 'Pcs',
      purchase_price: p.purchase_price || '',
      selling_price: p.selling_price || '',
      stock_qty: p.stock_qty || 0,
      low_stock_threshold: p.low_stock_threshold || 5,
      gst_rate: p.gst_rate ?? 18,
      package_unit: p.package_unit || '',
      package_qty: p.package_qty || 1,
      package_selling_price: p.package_selling_price || '',
      batch_number: p.batch_number || '',
      expiry_date: p.expiry_date || '',
      part_number: p.part_number || '',
      description: p.description || ''
    });
    setShowProductModal(true);
  };

  const handleStockPackagesChange = (val) => {
    setStockPackages(val);
    const boxes = parseFloat(val) || 0;
    const computedPcs = Math.round(boxes * (parseFloat(pkgQty) || 10));
    setFormData((prev) => ({
      ...prev,
      stock_qty: computedPcs
    }));
  };

  const handleStockBaseQtyChange = (val) => {
    setFormData((prev) => ({
      ...prev,
      stock_qty: val
    }));
    const pcs = parseFloat(val) || 0;
    const boxes = (pcs / (parseFloat(pkgQty) || 10)).toFixed(1).replace(/\.0$/, '');
    setStockPackages(boxes);
  };

  const handleSingleSellingPriceChange = (val) => {
    setFormData((prev) => {
      const singlePrice = parseFloat(val) || 0;
      const computedPkgPrice = (singlePrice * (parseFloat(pkgQty) || 10)).toFixed(2);
      return {
        ...prev,
        selling_price: val,
        package_selling_price: prev.package_selling_price && prev.package_selling_price !== '' ? prev.package_selling_price : computedPkgPrice
      };
    });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const isMulti = packagingMode === 'multi';
      const actualUnit = isMulti ? (looseUnit || 'Pcs') : (formData.unit || 'Pcs');
      const actualPkgUnit = isMulti ? (pkgUnit || 'Box') : '';
      const actualPkgQty = isMulti ? (parseFloat(pkgQty) || 10.0) : 1.0;
      const actualPkgPrice = isMulti
        ? (formData.package_selling_price ? parseFloat(formData.package_selling_price) : (parseFloat(formData.selling_price) || 0) * actualPkgQty)
        : 0.0;

      const payload = {
        ...formData,
        unit: actualUnit,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        stock_qty: parseFloat(formData.stock_qty) || 0,
        low_stock_threshold: parseFloat(formData.low_stock_threshold) || 5,
        gst_rate: parseFloat(formData.gst_rate) || 0,
        package_unit: actualPkgUnit,
        package_qty: actualPkgQty,
        package_selling_price: actualPkgPrice
      };

      if (!editingProduct) {
        payload.supplier_name = newProdSupplier.trim() || 'Opening Inventory';
        payload.supplier_bill_no = newProdBillNo.trim() || 'OPENING-STOCK';
        payload.has_discrepancy = newProdHasDiscrepancy;
        payload.billed_qty = newProdHasDiscrepancy && newProdBilledQty ? parseFloat(newProdBilledQty) : null;
        payload.stockist_remarks = newProdStockistRemarks.trim();
        if (newProdHasGift && newProdGiftName.trim()) {
          payload.free_items = [
            {
              item_name: newProdGiftName.trim(),
              quantity: parseFloat(newProdGiftQty) || 1,
              supplier_challan_ref: newProdGiftRef.trim() || newProdBillNo.trim() || 'OPENING-STOCK'
            }
          ];
        } else {
          payload.free_items = [];
        }
      }

      const url = editingProduct ? `/api/inventory/${editingProduct.id}` : '/api/inventory';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Failed to save product');
      }

      showToast(data.message || 'Product saved successfully.', 'success');
      setShowProductModal(false);
      loadProducts();
      loadInwardAlerts();
      loadVendorClaims('all');
      loadPromotionalGifts('all');
      refreshData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete product '${name}' from inventory?`)) return;
    try {
      const res = await apiFetch(`/api/inventory/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not delete product');
      showToast(data.message, 'success');
      loadProducts();
      refreshData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockProduct) return;
    try {
      const enteredQty = parseFloat(restockQty) || 0;
      const factor = (restockProduct.package_unit && restockProduct.package_qty > 1 && restockUnitType === 'pkg')
        ? restockProduct.package_qty
        : 1.0;
      const totalToAdd = Math.round(enteredQty * factor * 100) / 100;

      const res = await apiFetch(`/api/inventory/${restockProduct.id}/restock`, {
        method: 'POST',
        body: JSON.stringify({
          quantity: totalToAdd,
          notes: `Restocked ${enteredQty} ${restockUnitType === 'pkg' ? restockProduct.package_unit : restockProduct.unit}s (= +${totalToAdd} ${restockProduct.unit})`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to restock');
      showToast(data.message, 'success');
      setShowRestockModal(false);
      loadProducts();
      refreshData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const viewLedger = async (p = null) => {
    try {
      const url = p ? `/api/inventory/movements/ledger?product_id=${p.id}` : '/api/inventory/movements/ledger';
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setStockLedger(data);
        setShowLedgerModal(true);
      }
    } catch (err) {
      showToast('Could not fetch stock movements', 'error');
    }
  };

  const openInwardModal = async (p) => {
    setInwardProduct(p);
    setInwardQty('');
    setInwardSupplier('');
    setInwardBillNo('');
    setInwardBillDate(new Date().toISOString().split('T')[0]);
    setInwardCostPrice(p.purchase_price ? String(p.purchase_price) : '');
    setInwardOtp('');
    setInwardDeclaration('');
    setInwardHasDiscrepancy(false);
    setInwardBilledQty('');
    setInwardStockistRemarks('');
    setInwardHasGift(false);
    setInwardGiftName('');
    setInwardGiftQty('1');
    setInwardGiftRef('');
    setOtpSent(false);
    setInwardAuditStatus(null);
    setInwardAuthType('NORMAL');

    try {
      const res = await apiFetch(`/api/inventory/inward/status/${p.id}`);
      if (res.ok) {
        const data = await res.json();
        setInwardAuditStatus(data);
        if (data.has_unverified && !isAdmin) {
          setInwardAuthType('SMS_OTP');
        } else {
          setInwardAuthType('NORMAL');
        }
      }
    } catch (e) {
      console.error('Failed to check inward status:', e);
    }
    setShowInwardModal(true);
  };

  const handleSendRestockOtp = async () => {
    if (!inwardProduct) return;
    setOtpSending(true);
    try {
      const res = await apiFetch('/api/inventory/inward/request-otp', {
        method: 'POST',
        body: JSON.stringify({
          product_id: inwardProduct.id,
          quantity: parseFloat(inwardQty) || 1,
          supplier_bill_no: inwardBillNo || 'PENDING'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to dispatch OTP');
      showToast(data.message, 'success');
      setOtpSent(true);
      if (data.phone_hint) setPhoneHint(data.phone_hint);
      if (data.demo_otp) {
        setInwardOtp(data.demo_otp);
        showToast(`[Demo Mode] OTP autofilled: ${data.demo_otp}`, 'info');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setOtpSending(false);
    }
  };

  const handleInwardSubmit = async (e) => {
    e.preventDefault();
    if (!inwardProduct) return;
    setInwardSubmitting(true);
    try {
      const payload = {
        product_id: inwardProduct.id,
        quantity: parseFloat(inwardQty) || 0,
        supplier_name: inwardSupplier.trim(),
        supplier_bill_no: inwardBillNo.trim(),
        supplier_bill_date: inwardBillDate,
        cost_price: inwardCostPrice ? parseFloat(inwardCostPrice) : null,
        authorization_type: inwardAuthType,
        otp: inwardOtp.trim(),
        emergency_declaration: inwardDeclaration.trim(),
        has_discrepancy: inwardHasDiscrepancy,
        billed_qty: inwardHasDiscrepancy && inwardBilledQty ? parseFloat(inwardBilledQty) : null,
        stockist_remarks: inwardHasDiscrepancy ? inwardStockistRemarks.trim() : '',
        free_items: inwardHasGift && inwardGiftName.trim() ? [
          {
            item_name: inwardGiftName.trim(),
            quantity: parseFloat(inwardGiftQty) || 1,
            challan_reference: inwardGiftRef.trim()
          }
        ] : []
      };

      const res = await apiFetch('/api/inventory/inward', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to record stock inward');

      showToast(data.message, 'success');
      setShowInwardModal(false);
      setInwardHasGift(false);
      setInwardGiftName('');
      setInwardGiftQty('1');
      setInwardGiftRef('');
      loadProducts(true);
      refreshData();
      loadInwardAlerts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setInwardSubmitting(false);
    }
  };

  const loadAuditInwards = async (status = auditFilter) => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.append('status_filter', status);
      const res = await apiFetch(`/api/inventory/inwards?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAuditInwards(data);
      }
    } catch (err) {
      showToast('Error loading stock inward audit records', 'error');
    } finally {
      setAuditLoading(false);
    }
  };

  const loadVendorClaims = async (status = claimFilter) => {
    setClaimsLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.append('status_filter', status);
      const res = await apiFetch(`/api/inventory/vendor-claims?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setVendorClaims(data.claims || []);
        if (data.summary) setClaimsSummary(data.summary);
      }
    } catch (err) {
      console.error('Error loading vendor claims:', err);
    } finally {
      setClaimsLoading(false);
    }
  };

  const loadPromotionalGifts = async (status = giftFilter) => {
    setGiftsLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'all') {
        if (['CUSTOMER_PROMO_SCHEME', 'FESTIVAL_DIWALI_VAULT', 'OWNER_STORE_ASSET', 'SELLABLE_STOCK'].includes(status)) {
          params.append('allocation_filter', status);
        } else {
          params.append('status_filter', status);
        }
      }
      const res = await apiFetch(`/api/inventory/gifts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPromotionalGifts(data.gifts || []);
        if (data.summary) setGiftsSummary(data.summary);
      }
    } catch (err) {
      console.error('Error loading promotional gifts:', err);
    } finally {
      setGiftsLoading(false);
    }
  };

  const handleSettleClaim = async (e) => {
    e.preventDefault();
    if (!selectedClaimForSettle) return;
    setSettlingClaim(true);
    try {
      const res = await apiFetch(`/api/inventory/vendor-claims/${selectedClaimForSettle.claim_id}/settle`, {
        method: 'POST',
        body: JSON.stringify({
          settlement_type: settleType,
          settlement_ref: settleRef.trim(),
          notes: settleNotes.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to settle claim');
      showToast(data.message, 'success');
      setSelectedClaimForSettle(null);
      setSettleRef('');
      setSettleNotes('');
      loadVendorClaims(claimFilter);
      loadInwardAlerts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSettlingClaim(false);
    }
  };

  const handleAllocateGift = async (e) => {
    e.preventDefault();
    if (!selectedGiftForAllocation) return;
    setSubmittingAlloc(true);
    try {
      const payload = {
        allocation_type: giftAllocType,
        min_purchase_qty: giftAllocType === 'CUSTOMER_PROMO_SCHEME' ? parseFloat(giftMinQty) || 1 : null,
        target_product_id: giftTargetProdId || null,
        target_product_name: giftTargetProdId ? products.find(p => p.id === giftTargetProdId)?.name : '',
        person_name: giftAllocType === 'FESTIVAL_DIWALI_VAULT' ? giftPersonName.trim() : '',
        contact: giftAllocType === 'FESTIVAL_DIWALI_VAULT' ? giftContact.trim() : '',
        vault_notes: giftAllocType === 'FESTIVAL_DIWALI_VAULT' ? giftVaultNotes.trim() : '',
        selling_price: giftAllocType === 'SELLABLE_STOCK' ? parseFloat(giftSellingPrice) || 0 : 0,
        notes: ''
      };
      const res = await apiFetch(`/api/inventory/gifts/${selectedGiftForAllocation.gift_id}/allocate`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to allocate gift');
      showToast(data.message, 'success');
      setSelectedGiftForAllocation(null);
      loadPromotionalGifts(giftFilter);
      loadInwardAlerts();
      if (giftAllocType === 'SELLABLE_STOCK') loadProducts(true);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingAlloc(false);
    }
  };

  const handleVaultAction = async (e) => {
    e.preventDefault();
    if (!selectedGiftForHandover) return;
    setSubmittingHandover(true);
    try {
      const res = await apiFetch(`/api/inventory/gifts/${selectedGiftForHandover.gift_id}/vault-action`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'HANDED_OVER',
          recipient_name: handoverRecipient.trim(),
          notes: handoverNotes.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update vault gift');
      showToast(data.message, 'success');
      setSelectedGiftForHandover(null);
      setHandoverRecipient('');
      setHandoverNotes('');
      loadPromotionalGifts(giftFilter);
      loadInwardAlerts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingHandover(false);
    }
  };

  const loadStockistPerformance = async () => {
    try {
      const res = await apiFetch('/api/inventory/stockist-performance');
      if (res.ok) {
        const data = await res.json();
        setStockistPerformance(data);
      }
    } catch (e) {
      console.error('Failed to load stockist performance:', e);
    }
  };

  const openAuditTray = (initialTab = 'INWARDS') => {
    setShowAuditTrayModal(true);
    setAuditTrayTab(initialTab);
    loadAuditInwards(auditFilter);
    loadVendorClaims(claimFilter);
    loadPromotionalGifts(giftFilter);
    loadInwardAlerts();
    loadStockistPerformance();
  };

  const handleStockistStatementSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInwardForStatement || !stockistStatementInput.trim()) return;
    setSubmittingStatement(true);
    try {
      const res = await apiFetch(`/api/inventory/inward/${selectedInwardForStatement.id}/statement`, {
        method: 'POST',
        body: JSON.stringify({ statement: stockistStatementInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to submit statement');
      showToast(data.message, 'success');
      setSelectedInwardForStatement(null);
      setStockistStatementInput('');
      loadAuditInwards(auditFilter);
      loadInwardAlerts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingStatement(false);
    }
  };

  const handleAdminDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInwardForDecision) return;
    setSubmittingDecision(true);
    try {
      await handleAuditAction(
        selectedInwardForDecision.id,
        decisionActionType,
        null,
        decisionNotesInput.trim()
      );
      setSelectedInwardForDecision(null);
      setDecisionNotesInput('');
      loadInwardAlerts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleAuditAction = async (inwardId, action, actualBillQty = null, notes = '', correctedQty = null) => {
    try {
      const res = await apiFetch(`/api/inventory/inward/${inwardId}/audit`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          actual_bill_qty: actualBillQty !== null ? parseFloat(actualBillQty) : null,
          corrected_qty: correctedQty !== null ? parseFloat(correctedQty) : null,
          audit_notes: notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Audit action failed');
      showToast(data.message, 'success');
      setSelectedInwardForDiscrepancy(null);
      setSelectedInwardForRecount(null);
      setSelectedInwardForDecision(null);
      loadAuditInwards(auditFilter);
      loadInwardAlerts();
      loadProducts();
      refreshData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div>
      {/* Real-time In-App Discrepancy & Audit Alerts */}
      {!isAdmin && inwardAlerts?.action_inwards?.length > 0 && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            padding: '12px 18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                padding: '2px 8px',
                borderRadius: '4px',
                letterSpacing: '0.5px'
              }}
            >
              ACTION REQUIRED
            </span>
            <div style={{ fontSize: '13px', color: '#991B1B' }}>
              Store Owner flagged/disputed Bill #{inwardAlerts.action_inwards[0].supplier_bill_no} ({inwardAlerts.action_inwards[0].product_name}).
              {inwardAlerts.action_inwards[0].admin_decision_notes && (
                <span style={{ fontWeight: 600 }}> Note: "{inwardAlerts.action_inwards[0].admin_decision_notes}"</span>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              const target = inwardAlerts.action_inwards[0];
              setSelectedInwardForStatement(target);
              setStockistStatementInput('');
            }}
            className="btn btn-sm"
            style={{ backgroundColor: '#DC2626', color: '#FFFFFF', borderColor: '#DC2626', fontWeight: 600 }}
          >
            Submit Explanation &amp; Appeal &rarr;
          </button>
        </div>
      )}

      {isAdmin && inwardAlerts?.action_inwards?.length > 0 && (
        <div
          style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '8px',
            padding: '12px 18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: '#1E40AF',
                color: '#FFFFFF',
                padding: '2px 8px',
                borderRadius: '4px',
                letterSpacing: '0.5px'
              }}
            >
              PENDING AUDIT
            </span>
            <div style={{ fontSize: '13px', color: '#1E3A8A' }}>
              {inwardAlerts.action_inwards.length} delivery discrepancy awaiting owner review, appeal decision, or physical recount.
            </div>
          </div>
          <button
            onClick={() => {
              setAuditFilter('FLAGGED_DISCREPANCY');
              openAuditTray('INWARDS');
            }}
            className="btn btn-sm"
            style={{ backgroundColor: '#1E40AF', color: '#FFFFFF', borderColor: '#1E40AF', fontWeight: 600 }}
          >
            Review &amp; Recount &rarr;
          </button>
        </div>
      )}

      {isAdmin && inwardAlerts?.pending_claims_count > 0 && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '12px 18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: '#991B1B',
                color: '#FFFFFF',
                padding: '2px 8px',
                borderRadius: '4px',
                letterSpacing: '0.5px'
              }}
            >
              VENDOR DEBIT CLAIM
            </span>
            <div style={{ fontSize: '13px', color: '#991B1B' }}>
              <b>{inwardAlerts.pending_claims_count} supplier shortage claim(s) totaling ₹{inwardAlerts.pending_claims_total}</b> pending settlement / deduction from supplier bills.
            </div>
          </div>
          <button
            onClick={() => openAuditTray('VENDOR_CLAIMS')}
            className="btn btn-sm"
            style={{ backgroundColor: '#991B1B', color: '#FFFFFF', borderColor: '#991B1B', fontWeight: 600 }}
          >
            View Vendor Claims &rarr;
          </button>
        </div>
      )}

      {isAdmin && inwardAlerts?.pending_gifts_count > 0 && (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '8px',
            padding: '12px 18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: '#B45309',
                color: '#FFFFFF',
                padding: '2px 8px',
                borderRadius: '4px',
                letterSpacing: '0.5px'
              }}
            >
              GIFT ALLOCATION
            </span>
            <div style={{ fontSize: '13px', color: '#92400E' }}>
              <b>{inwardAlerts.pending_gifts_count} promotional / free gift(s)</b> received from suppliers awaiting Owner allocation (Customer Scheme, Diwali Vault, Store Asset).
            </div>
          </div>
          <button
            onClick={() => openAuditTray('GIFT_VAULT')}
            className="btn btn-sm"
            style={{ backgroundColor: '#B45309', color: '#FFFFFF', borderColor: '#B45309', fontWeight: 600 }}
          >
            Allocate Gifts &rarr;
          </button>
        </div>
      )}

      {/* Top Controls & Filtering Bar */}
      <div className="ledger-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1', minWidth: '280px' }}>
            <input
              type="text"
              placeholder="Search product name, SKU, Part #, or Batch #..."
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
            {search && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSearch('');
                  loadProducts();
                }}
              >
                Clear
              </button>
            )}
          </form>

          {/* Category & Status Dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock (≤ Threshold)</option>
              <option value="out_of_stock">Out of Stock (0)</option>
            </select>

            <button onClick={() => viewLedger(null)} className="btn btn-secondary">
              Stock Ledger
            </button>

            <button onClick={() => openAuditTray('INWARDS')} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>Stock Audit Tray</span>
              {inwardAlerts?.total_alert_count > 0 && (
                <span
                  style={{
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    marginLeft: '2px'
                  }}
                >
                  {inwardAlerts.total_alert_count}
                </span>
              )}
            </button>

            {/* Direct Button: Vendor Debit Claims */}
            <button
              onClick={() => openAuditTray('VENDOR_CLAIMS')}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: claimsSummary?.pending_count > 0 ? '#FCA5A5' : undefined,
                backgroundColor: claimsSummary?.pending_count > 0 ? '#FEF2F2' : undefined,
                color: claimsSummary?.pending_count > 0 ? '#991B1B' : undefined,
                fontWeight: claimsSummary?.pending_count > 0 ? 600 : undefined
              }}
              title="Open Vendor Debit Claims Tray to deduct shortage amounts from supplier payments"
            >
              <span>Vendor Debit Claims</span>
              {claimsSummary?.pending_count > 0 && (
                <span
                  style={{
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px'
                  }}
                >
                  ₹{claimsSummary.pending_total} ({claimsSummary.pending_count})
                </span>
              )}
            </button>

            {/* Direct Button: Gift & Scheme Vault */}
            <button
              onClick={() => openAuditTray('GIFT_VAULT')}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: giftsSummary?.pending_allocation_count > 0 ? '#BAE6FD' : undefined,
                backgroundColor: giftsSummary?.pending_allocation_count > 0 ? '#F0F9FF' : undefined,
                color: giftsSummary?.pending_allocation_count > 0 ? '#0369A1' : undefined,
                fontWeight: giftsSummary?.pending_allocation_count > 0 ? 600 : undefined
              }}
              title="Open Gift & Scheme Vault to manage supplier promotional gifts & customer schemes"
            >
              <span>Gift &amp; Scheme Vault</span>
              {giftsSummary?.pending_allocation_count > 0 && (
                <span
                  style={{
                    backgroundColor: '#0284C7',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px'
                  }}
                >
                  {giftsSummary.pending_allocation_count} Pending
                </span>
              )}
            </button>

            {(isAdmin || user?.role === 'inventory_manager') && (
              <button onClick={openAddModal} className="btn btn-primary">
                <span>+</span> Add Product
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Inventory Table */}
      <div className="ledger-table-container">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>SKU / Code</th>
              <th>Product Details</th>
              <th>Category</th>
              <th>GST %</th>
              {isAdmin && <th style={{ textAlign: 'right' }}>Cost Price</th>}
              <th style={{ textAlign: 'right' }}>Selling Price</th>
              <th style={{ textAlign: 'center' }}>Stock Available</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th className="table-sticky-actions" style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && products.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)' }}>
                  Loading inventory catalog from MongoDB...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)' }}>
                  No matching products found in inventory. Click <b>"+ Add Product"</b> to create your first item.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const isLow = p.stock_status === 'low_stock';
                const isOut = p.stock_status === 'out_of_stock';
                return (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-forest)' }}>
                      {p.sku}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                        {p.part_number && <span>Part #: {p.part_number} • </span>}
                        {p.batch_number && <span>Batch: {p.batch_number} • </span>}
                        {p.expiry_date && <span>Exp: {p.expiry_date}</span>}
                      </div>
                    </td>
                    <td>
                      <span style={{ backgroundColor: 'var(--color-stone-light)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                        {p.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.gst_rate}%</td>
                    {isAdmin && (
                      <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--color-muted)' }}>
                        ₹{Number(p.purchase_price || 0).toFixed(2)}
                      </td>
                    )}
                    <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-forest)' }}>
                      ₹{p.selling_price.toFixed(2)}
                    </td>
                    <td className="tabular-nums" style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: '13.5px', color: isOut ? '#991B1B' : isLow ? '#92400E' : 'inherit' }}>
                        {p.stock_qty} {p.unit}
                      </div>
                      {p.package_unit && p.package_qty > 1 && (
                        <div style={{ fontSize: '11px', color: 'var(--color-forest)', fontWeight: 600, marginTop: '2px' }}>
                          {Math.floor(p.stock_qty / p.package_qty)} {p.package_unit}s
                          {Math.round(p.stock_qty % p.package_qty) > 0 ? ` + ${Math.round(p.stock_qty % p.package_qty)} ${p.unit}` : ''}
                          <span style={{ color: 'var(--color-muted)', fontWeight: 500 }}>
                            {' '}({(p.stock_qty / p.package_qty).toFixed(1)} {p.package_unit}s)
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className={`status-pill ${
                          isOut ? 'status-out-stock' : isLow ? 'status-low-stock' : 'status-paid'
                        }`}
                      >
                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td className="table-sticky-actions" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {(isAdmin || user?.role === 'inventory_manager') ? (
                          <>
                            <button
                              onClick={() => openInwardModal(p)}
                              title="Stock Inward & Restock"
                              className="btn btn-secondary btn-xs"
                            >
                              + Inward
                            </button>

                            <button
                              onClick={() => openEditModal(p)}
                              title="Edit Product"
                              className="btn btn-ghost btn-xs"
                            >
                              Edit
                            </button>

                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                title="Delete Product"
                                className="btn btn-danger-subtle btn-xs"
                                style={{ color: '#DC2626' }}
                              >
                                ✕
                              </button>
                            )}
                          </>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--color-muted)', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--color-ivory-dark)' }}>
                            Catalog Item
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="modal-backdrop">
          <div className="modal-sheet modal-sheet-lg" style={{ maxHeight: '90vh' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--color-forest)' }}>
                {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Inventory Product'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Product Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. Reynolds 045 Ball Pen or Classmate A4 Notebook"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">SKU / Code *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. STAT-PEN-01 or STAT-NOTE-01"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Category *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. Stationery, Paper, Office Supplies"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Applicable GST Rate (%) *</label>
                    <select
                      className="form-select"
                      value={formData.gst_rate}
                      onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                    >
                      <option value={0}>0% (Exempt)</option>
                      <option value={5}>5% GST</option>
                      <option value={12}>12% GST</option>
                      <option value={18}>18% GST (Standard)</option>
                      <option value={28}>28% GST (Luxury/Auto)</option>
                    </select>
                  </div>
                </div>

                {/* Packaging & Multi-Unit Selector Mode */}
                <div style={{ backgroundColor: 'var(--color-stone-light)', border: '1px solid var(--color-stone)', borderRadius: '8px', padding: '12px 14px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-forest)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Packaging & Multi-Unit Mode
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginBottom: '10px' }}>
                    Choose how this item is stocked and sold in your shop:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                    <div
                      onClick={() => setPackagingMode('single')}
                      style={{
                        border: `2px solid ${packagingMode === 'single' ? 'var(--color-forest)' : 'var(--color-stone)'}`,
                        backgroundColor: packagingMode === 'single' ? '#ffffff' : '#faf8f5',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px'
                      }}
                    >
                      <input type="radio" checked={packagingMode === 'single'} onChange={() => setPackagingMode('single')} style={{ marginTop: '3px' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--color-charcoal)' }}>Single Unit Only</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--color-muted)' }}>Sold only in loose pieces, kg, litres, or meters.</div>
                      </div>
                    </div>

                    <div
                      onClick={() => setPackagingMode('multi')}
                      style={{
                        border: `2px solid ${packagingMode === 'multi' ? 'var(--color-forest)' : 'var(--color-stone)'}`,
                        backgroundColor: packagingMode === 'multi' ? '#ffffff' : '#faf8f5',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px'
                      }}
                    >
                      <input type="radio" checked={packagingMode === 'multi'} onChange={() => setPackagingMode('multi')} style={{ marginTop: '3px' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--color-forest)' }}>Box / Pack with Multiple Pieces</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--color-muted)' }}>Sell in full boxes, half boxes, OR single loose pieces (e.g. 1 Box = 10 Pcs).</div>
                      </div>
                    </div>
                  </div>

                  {packagingMode === 'single' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Unit of Measure *</label>
                        <select className="form-select" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
                          <option value="Pcs">Pcs (Pieces)</option>
                          <option value="Kg">Kg (Kilograms)</option>
                          <option value="Litre">Litre</option>
                          <option value="Meter">Meter</option>
                          <option value="Pack">Pack</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Purchase Cost (₹) *</label>
                        <input type="number" step="0.01" min="0" required className="form-input" value={formData.purchase_price} onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })} placeholder="0.00" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Selling Price (₹) *</label>
                        <input type="number" step="0.01" min="0" required className="form-input" value={formData.selling_price} onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })} placeholder="0.00" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Stock Quantity *</label>
                        <input type="number" step="any" min="0" required className="form-input" value={formData.stock_qty} onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })} placeholder="0" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Low Stock Threshold *</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          className="form-input"
                          value={formData.low_stock_threshold}
                          onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                          placeholder="e.g. 5"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Step 1: Definition */}
                      <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--color-stone)', borderRadius: '6px', padding: '10px 12px', marginBottom: '10px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-forest)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Step 1: Packaging Relation (e.g. 1 Box = 10 Pcs)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Bulk Packaging Unit *</label>
                            <input
                              type="text"
                              required
                              className="form-input"
                              placeholder="e.g. Box, Strip, Pack, Carton, Bag"
                              value={pkgUnit}
                              onChange={(e) => setPkgUnit(e.target.value)}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Loose Single Unit Inside *</label>
                            <input
                              type="text"
                              required
                              className="form-input"
                              placeholder="e.g. Pcs, Tablets, Grams, Units"
                              value={looseUnit}
                              onChange={(e) => setLooseUnit(e.target.value)}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">How many {looseUnit || 'Pcs'} in 1 {pkgUnit || 'Box'}? *</label>
                            <input
                              type="number"
                              min="1"
                              step="any"
                              required
                              className="form-input"
                              value={pkgQty}
                              onChange={(e) => setPkgQty(e.target.value)}
                              placeholder="10"
                            />
                          </div>
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--color-forest)', fontWeight: 700 }}>
                          Formula: 1 {pkgUnit || 'Box'} = {pkgQty || 10} {looseUnit || 'Pcs'}
                        </div>
                      </div>

                      {/* Step 2: Stock Entry */}
                      <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--color-stone)', borderRadius: '6px', padding: '10px 12px', marginBottom: '10px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-forest)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Step 2: Enter Inventory Stock in Hand
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Total Stock in {pkgUnit || 'Box'}es</label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              className="form-input"
                              placeholder={`e.g. 10 ${pkgUnit || 'Box'}es`}
                              value={stockPackages}
                              onChange={(e) => handleStockPackagesChange(e.target.value)}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Total in {looseUnit || 'Pcs'} (Base Units) *</label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              required
                              className="form-input"
                              placeholder={`e.g. 100 ${looseUnit || 'Pcs'}`}
                              value={formData.stock_qty}
                              onChange={(e) => handleStockBaseQtyChange(e.target.value)}
                            />
                          </div>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-forest)', fontWeight: 600, marginTop: '4px' }}>
                          Total Stock: <b>{formData.stock_qty || 0} {looseUnit || 'Pcs'}</b>
                          {(parseFloat(pkgQty) || 10) > 1 && (
                            <span> ≈ {Math.floor((Number(formData.stock_qty) || 0) / (parseFloat(pkgQty) || 10))} {pkgUnit || 'Box'}es{Math.round((Number(formData.stock_qty) || 0) % (parseFloat(pkgQty) || 10)) > 0 ? ` + ${Math.round((Number(formData.stock_qty) || 0) % (parseFloat(pkgQty) || 10))} ${looseUnit || 'Pcs'}` : ''} ({( (Number(formData.stock_qty) || 0) / (parseFloat(pkgQty) || 10) ).toFixed(1)} {pkgUnit || 'Box'}es)</span>
                          )}
                        </div>
                      </div>

                      {/* Step 3: Pricing */}
                      <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--color-stone)', borderRadius: '6px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-forest)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Step 3: Selling & Purchase Prices
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Price per 1 {looseUnit || 'Pc'} (Loose) *</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              className="form-input"
                              placeholder="e.g. 10.00"
                              value={formData.selling_price}
                              onChange={(e) => handleSingleSellingPriceChange(e.target.value)}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Price per 1 {pkgUnit || 'Box'} (Full Pack)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="form-input"
                              placeholder={`e.g. ${(Number(formData.selling_price || 0) * (parseFloat(pkgQty) || 10)).toFixed(2)}`}
                              value={formData.package_selling_price}
                              onChange={(e) => setFormData({ ...formData, package_selling_price: e.target.value })}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginTop: '8px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Purchase Cost per {looseUnit || 'Pc'} *</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              className="form-input"
                              placeholder="e.g. 9.00"
                              value={formData.purchase_price}
                              onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Low Stock Alert ({looseUnit || 'Pcs'})</label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              className="form-input"
                              value={formData.low_stock_threshold}
                              onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Industry Specific Fields (Pharmacy & Automotive) */}
                <div style={{ padding: '10px 12px', backgroundColor: 'var(--color-stone-light)', borderRadius: '6px', marginTop: '6px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-forest)', marginBottom: '6px' }}>
                    Industry Specific Fields (Optional - Pharma & Automobile)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Batch No (Pharma)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. BATCH-992"
                        value={formData.batch_number}
                        onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Expiry Date (Pharma)</label>
                      <input
                        type="date"
                        className="form-input"
                        value={formData.expiry_date}
                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Part Number (Auto/Hardware)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. OEM-48201"
                        value={formData.part_number}
                        onChange={(e) => setFormData({ ...formData, part_number: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </div>
                </div>

                {/* Incoming Supplier Delivery & Discrepancy / Promotional Gifts (New Product Only) */}
                {!editingProduct && (
                  <div style={{ padding: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', marginTop: '10px' }}>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#1E293B', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Incoming Supplier Delivery &amp; Inward Details (Optional)</span>
                      <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 500 }}>Records audit bill &amp; promotional gifts</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '11.5px' }}>Supplier / Vendor Name</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Bharat Stationary"
                          value={newProdSupplier}
                          onChange={(e) => setNewProdSupplier(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '11.5px' }}>Supplier Bill / Invoice #</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. #BHS-1010"
                          value={newProdBillNo}
                          onChange={(e) => setNewProdBillNo(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Discrepancy Checkbox & Fields */}
                    <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '8px', marginTop: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#991B1B' }}>
                        <input
                          type="checkbox"
                          checked={newProdHasDiscrepancy}
                          onChange={(e) => setNewProdHasDiscrepancy(e.target.checked)}
                        />
                        <span>Report Delivery Shortage / Bill Discrepancy on Initial Stock</span>
                      </label>
                      {newProdHasDiscrepancy && (
                        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '6px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '11px', color: '#991B1B' }}>Billed Qty on Invoice *</label>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                required={newProdHasDiscrepancy}
                                className="form-input"
                                placeholder="e.g. 100"
                                value={newProdBilledQty}
                                onChange={(e) => setNewProdBilledQty(e.target.value)}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '11px', color: '#991B1B' }}>Shortage Explanation / Reason *</label>
                              <input
                                type="text"
                                required={newProdHasDiscrepancy}
                                className="form-input"
                                placeholder="e.g. 5 units short in carton delivery; contacted distributor."
                                value={newProdStockistRemarks}
                                onChange={(e) => setNewProdStockistRemarks(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Free Promotional Gifts Checkbox & Fields */}
                    <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '8px', marginTop: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#1E40AF' }}>
                        <input
                          type="checkbox"
                          checked={newProdHasGift}
                          onChange={(e) => setNewProdHasGift(e.target.checked)}
                        />
                        <span>Free Promotional / Festival Gift Merchandise Included</span>
                      </label>
                      {newProdHasGift && (
                        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr', gap: '8px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '11px', color: '#1E40AF' }}>Gift Item Name *</label>
                              <input
                                type="text"
                                required={newProdHasGift}
                                className="form-input"
                                placeholder="e.g. 3x Trial Fine Pens"
                                value={newProdGiftName}
                                onChange={(e) => setNewProdGiftName(e.target.value)}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '11px', color: '#1E40AF' }}>Gift Quantity *</label>
                              <input
                                type="number"
                                step="any"
                                min="1"
                                required={newProdHasGift}
                                className="form-input"
                                value={newProdGiftQty}
                                onChange={(e) => setNewProdGiftQty(e.target.value)}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '11px', color: '#1E40AF' }}>Challan / Promo Ref</label>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. Free sample with box"
                                value={newProdGiftRef}
                                onChange={(e) => setNewProdGiftRef(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowProductModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Inward & Security Restock Modal */}
      {showInwardModal && inwardProduct && (
        <div className="modal-backdrop">
          <div className="modal-sheet" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '15.5px' }}>Stock Inward: {inwardProduct.name}</h3>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                  SKU: {inwardProduct.sku} • Current Stock: <b>{inwardProduct.stock_qty} {inwardProduct.unit}</b>
                </div>
              </div>
              <button onClick={() => setShowInwardModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleInwardSubmit}>
              <div className="modal-body">
                {/* Security Status Alert Box */}
                {inwardAuditStatus?.has_unverified && (
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #FDE68A',
                      marginBottom: '16px',
                      fontSize: '12px',
                      color: '#92400E'
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                      Security Notice: Prior Delivery Pending Admin Audit
                    </div>
                    <div>
                      Previous delivery from Bill #{inwardAuditStatus.oldest_unverified?.supplier_bill_no || 'Prior Batch'} has not yet been audited against physical invoices.
                    </div>
                  </div>
                )}

                {/* Inward Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Quantity Received ({inwardProduct.unit}) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      required
                      className="form-input"
                      value={inwardQty}
                      onChange={(e) => setInwardQty(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Purchase Cost / Unit (₹)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-input"
                      placeholder={String(inwardProduct.purchase_price || '0.00')}
                      value={inwardCostPrice}
                      onChange={(e) => setInwardCostPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Supplier / Vendor Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="Enter supplier name"
                      value={inwardSupplier}
                      onChange={(e) => setInwardSupplier(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Supplier Invoice / Challan # *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="Enter invoice or bill number"
                      value={inwardBillNo}
                      onChange={(e) => setInwardBillNo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Supplier Bill Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={inwardBillDate}
                    onChange={(e) => setInwardBillDate(e.target.value)}
                  />
                </div>

                {/* Arrival Discrepancy / Shortage Reporting */}
                <div style={{ borderTop: '1px solid var(--color-stone-light)', paddingTop: '12px', marginTop: '12px', marginBottom: '14px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#92400E' }}>
                    <input
                      type="checkbox"
                      checked={inwardHasDiscrepancy}
                      onChange={(e) => {
                        setInwardHasDiscrepancy(e.target.checked);
                        if (!e.target.checked) {
                          setInwardBilledQty('');
                          setInwardStockistRemarks('');
                        }
                      }}
                    />
                    Report Supplier Invoice Discrepancy / Shortage on Arrival
                  </label>

                  {inwardHasDiscrepancy && (
                    <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', padding: '12px', borderRadius: '6px', marginTop: '10px' }}>
                      <div className="form-group" style={{ marginBottom: '10px' }}>
                        <label className="form-label" style={{ fontSize: '11.5px', color: '#92400E' }}>
                          Billed Quantity on Supplier Invoice *
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          required={inwardHasDiscrepancy}
                          className="form-input"
                          placeholder="e.g. 100 (as billed on invoice)"
                          value={inwardBilledQty}
                          onChange={(e) => setInwardBilledQty(e.target.value)}
                        />
                        {inwardBilledQty && inwardQty && parseFloat(inwardBilledQty) > parseFloat(inwardQty) && (
                          <div style={{ fontSize: '11px', color: '#B45309', marginTop: '4px', fontWeight: 600 }}>
                            Shortage Detected: {Math.round((parseFloat(inwardBilledQty) - parseFloat(inwardQty)) * 1000) / 1000} units short on delivery.
                          </div>
                        )}
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '11.5px', color: '#92400E' }}>
                          Stockist Discrepancy Statement / Reason Note *
                        </label>
                        <textarea
                          rows={2}
                          required={inwardHasDiscrepancy}
                          className="form-input"
                          placeholder="e.g. Supplier bill shows 100, but physical box only contained 95 pens. 5 units short."
                          value={inwardStockistRemarks}
                          onChange={(e) => setInwardStockistRemarks(e.target.value)}
                          style={{ fontSize: '12px' }}
                        />
                        <div style={{ fontSize: '11px', color: '#B45309', marginTop: '4px' }}>
                          This shortage statement will be sent instantly via SMS to the Store Owner for audit.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Free / Promotional Gifts Inward Section */}
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px 12px', marginTop: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', color: '#1E293B' }}>
                    <input
                      type="checkbox"
                      checked={inwardHasGift}
                      onChange={(e) => {
                        setInwardHasGift(e.target.checked);
                        if (!e.target.checked) {
                          setInwardGiftName('');
                          setInwardGiftQty('1');
                          setInwardGiftRef('');
                        }
                      }}
                    />
                    <span>Free / Promotional Gift Merchandise Included with Delivery?</span>
                  </label>
                  {inwardHasGift && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px', color: '#475569' }}>Gift Item Name *</label>
                          <input
                            type="text"
                            required={inwardHasGift}
                            className="form-input"
                            placeholder="e.g. Milton 1L Steel Bottle, 3 Trial Pens, Umbrella"
                            value={inwardGiftName}
                            onChange={(e) => setInwardGiftName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px', color: '#475569' }}>Gift Qty *</label>
                          <input
                            type="number"
                            min="1"
                            step="any"
                            required={inwardHasGift}
                            className="form-input"
                            value={inwardGiftQty}
                            onChange={(e) => setInwardGiftQty(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '11px', color: '#475569' }}>Challan / Invoice Reference</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Line 5 / Scheme bonus noted on bill"
                          value={inwardGiftRef}
                          onChange={(e) => setInwardGiftRef(e.target.value)}
                        />
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                        Note: Stockist records incoming gifts on arrival. Allocation (Customer Scheme, Diwali Vault, Store Asset) is decided solely by the Store Owner.
                      </div>
                    </div>
                  )}
                </div>

                {/* Authorization Mode Selection if Prior Inward Unverified */}
                {inwardAuditStatus?.has_unverified && !isAdmin && (
                  <div style={{ borderTop: '1px solid var(--color-stone-light)', paddingTop: '14px', marginTop: '10px' }}>
                    <label className="form-label" style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                      Select Restock Authorization Mode:
                    </label>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="auth_type"
                          value="SMS_OTP"
                          checked={inwardAuthType === 'SMS_OTP'}
                          onChange={() => setInwardAuthType('SMS_OTP')}
                        />
                        Option 1: Owner SMS OTP
                      </label>
                      <label style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="auth_type"
                          value="EMERGENCY_OVERRIDE"
                          checked={inwardAuthType === 'EMERGENCY_OVERRIDE'}
                          onChange={() => setInwardAuthType('EMERGENCY_OVERRIDE')}
                        />
                        Option 2: Emergency Declaration
                      </label>
                    </div>

                    {inwardAuthType === 'SMS_OTP' && (
                      <div style={{ backgroundColor: '#F8F6F0', padding: '12px', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                          <button
                            type="button"
                            onClick={handleSendRestockOtp}
                            disabled={otpSending}
                            className="btn btn-secondary btn-sm"
                          >
                            {otpSending ? 'Dispatching SMS...' : (otpSent ? 'Resend OTP' : 'Request Owner OTP')}
                          </button>
                          {otpSent && (
                            <span style={{ fontSize: '11.5px', color: 'var(--color-forest)', fontWeight: 600 }}>
                              OTP dispatched to Owner {phoneHint ? `(•••• ${phoneHint})` : ''}
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="Enter 6-digit OTP from Owner"
                          className="form-input"
                          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '2px', fontWeight: 700 }}
                          value={inwardOtp}
                          onChange={(e) => setInwardOtp(e.target.value)}
                        />
                      </div>
                    )}

                    {inwardAuthType === 'EMERGENCY_OVERRIDE' && (
                      <div style={{ backgroundColor: '#FFFBEB', padding: '12px', borderRadius: '6px' }}>
                        <label className="form-label" style={{ fontSize: '11.5px', color: '#92400E' }}>
                          Mandatory Statement (Min 10 characters explaining why restock is proceeding):
                        </label>
                        <textarea
                          rows={2}
                          required
                          minLength={10}
                          placeholder="Enter reason for emergency restock without prior audit"
                          className="form-input"
                          style={{ fontSize: '12px' }}
                          value={inwardDeclaration}
                          onChange={(e) => setInwardDeclaration(e.target.value)}
                        />
                        <div style={{ fontSize: '11px', color: '#B45309', marginTop: '4px' }}>
                          This statement will be permanently recorded in MongoDB and texted to the Store Owner immediately.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowInwardModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={inwardSubmitting} className="btn btn-primary">
                  {inwardSubmitting ? 'Logging Inward...' : 'Confirm Inward & Notify Owner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Stock Inward Audit Tray Modal */}
      {showAuditTrayModal && (
        <div className="modal-backdrop">
          <div className="modal-sheet modal-sheet-lg" style={{ maxWidth: '1180px', width: '96vw' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Stock Inward, Claims &amp; Gift Audit Tray</h3>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                  Audit incoming shipments, track supplier debit claims, and allocate promotional/festival gifts.
                </div>
              </div>
              <button onClick={() => setShowAuditTrayModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '72vh' }}>
              {/* Primary Section Switch */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setAuditTrayTab('INWARDS')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: auditTrayTab === 'INWARDS' ? '#243C32' : '#F1F5F9',
                    color: auditTrayTab === 'INWARDS' ? '#FFFFFF' : '#475569'
                  }}
                >
                  Shipment Inward Audit ({auditInwards.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuditTrayTab('VENDOR_CLAIMS');
                    loadVendorClaims(claimFilter);
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: auditTrayTab === 'VENDOR_CLAIMS' ? '#991B1B' : '#F1F5F9',
                    color: auditTrayTab === 'VENDOR_CLAIMS' ? '#FFFFFF' : '#475569',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Vendor Debit Claims</span>
                  {claimsSummary.pending_count > 0 && (
                    <span style={{ backgroundColor: '#FEE2E2', color: '#991B1B', fontSize: '10.5px', padding: '1px 6px', borderRadius: '10px' }}>
                      ₹{claimsSummary.pending_total} ({claimsSummary.pending_count})
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuditTrayTab('GIFT_VAULT');
                    loadPromotionalGifts(giftFilter);
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: auditTrayTab === 'GIFT_VAULT' ? '#1E40AF' : '#F1F5F9',
                    color: auditTrayTab === 'GIFT_VAULT' ? '#FFFFFF' : '#475569',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Promotional &amp; Festival Gift Vault</span>
                  {giftsSummary.pending_allocation_count > 0 && (
                    <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '10.5px', padding: '1px 6px', borderRadius: '10px' }}>
                      {giftsSummary.pending_allocation_count} Pending
                    </span>
                  )}
                </button>
              </div>

              {/* TAB 1: SHIPMENT INWARD AUDIT */}
              {auditTrayTab === 'INWARDS' && (
                <div>
                  {/* Stockist Inward & Audit Performance */}
                  {stockistPerformance && stockistPerformance.length > 0 && (
                    <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{isAdmin ? 'Stockist Inward & Audit Performance' : 'My Receiving & Audit Performance'}</span>
                            <span style={{ fontSize: '10.5px', fontWeight: 600, padding: '1px 8px', borderRadius: '10px', backgroundColor: '#F1F5F9', color: '#475569' }}>
                              Storekeeper
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            {isAdmin
                              ? 'Tracking count accuracy, physical bill matching, and verified arrival statements.'
                              : 'Your physical receiving count accuracy and verified arrival records audited by Store Owner.'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                        {stockistPerformance.map((sp) => {
                          const hasAudited = sp.accuracy_rate !== null && sp.accuracy_rate !== undefined;
                          return (
                            <div
                              key={sp.username}
                              style={{
                                padding: '10px 12px',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: '6px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                <div style={{ fontWeight: 600, fontSize: '12.5px', color: '#0F172A' }}>
                                  {sp.full_name || sp.username}
                                </div>
                                <span
                                  style={{
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    backgroundColor: hasAudited ? (sp.accuracy_rate >= 90 ? '#DCFCE7' : sp.accuracy_rate >= 70 ? '#FEF3C7' : '#FEE2E2') : '#F1F5F9',
                                    color: hasAudited ? (sp.accuracy_rate >= 90 ? '#166534' : sp.accuracy_rate >= 70 ? '#B45309' : '#991B1B') : '#475569'
                                  }}
                                >
                                  {hasAudited ? `${sp.accuracy_rate}% Accuracy` : 'Pending First Audit'}
                                </span>
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span><b>{sp.verified_count}</b> verified</span>
                                <span>•</span>
                                <span><b>{sp.rejected_count}</b> rejected</span>
                                {sp.discrepancy_count > 0 && (
                                  <>
                                    <span>•</span>
                                    <span style={{ color: '#B45309' }}><b>{sp.discrepancy_count}</b> shortages</span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Filter Tabs */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[
                        { id: 'all', label: 'All Inwards' },
                        { id: 'PENDING_AUDIT', label: 'Pending Audit' },
                        { id: 'VERIFIED', label: 'Verified' },
                        { id: 'FLAGGED_DISCREPANCY', label: 'Discrepancies' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setAuditFilter(tab.id);
                            loadAuditInwards(tab.id);
                          }}
                          className={`btn btn-xs ${auditFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                      Showing {auditInwards.length} records
                    </div>
                  </div>

                  {auditLoading ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)' }}>
                      Loading stock inward logs...
                    </div>
                  ) : auditInwards.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)', backgroundColor: '#F8F6F0', borderRadius: '6px' }}>
                      No inward records found for this filter.
                    </div>
                  ) : (
                    <div className="ledger-table-container" style={{ border: '1px solid var(--color-stone-light)', borderRadius: '8px', overflowX: 'auto', maxHeight: '54vh' }}>
                      <table className="ledger-table" style={{ width: '100%', minWidth: '1060px' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '135px' }}>Date &amp; Time</th>
                            <th style={{ width: '180px' }}>Product &amp; SKU</th>
                            <th style={{ width: '85px', textAlign: 'center' }}>Inward Qty</th>
                            <th style={{ minWidth: '170px' }}>Supplier &amp; Bill #</th>
                            <th style={{ width: '110px' }}>Received By</th>
                            <th style={{ width: '105px' }}>Auth Mode</th>
                            <th style={{ width: '150px', textAlign: 'center' }}>Status &amp; Audit Trail</th>
                            <th style={{ width: '250px', textAlign: 'right', paddingRight: '16px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditInwards.map((inw) => {
                            const isPending = inw.status === 'PENDING_AUDIT';
                            const isVerified = inw.status === 'VERIFIED';
                            const isDiscrepancy = inw.status === 'FLAGGED_DISCREPANCY';
                            return (
                              <tr key={inw.id}>
                                <td style={{ fontSize: '11px', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                                  {new Date(inw.created_at).toLocaleString('en-IN')}
                                </td>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{inw.product_name}</div>
                                  <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>{inw.sku}</div>
                                </td>
                                <td className="tabular-nums" style={{ textAlign: 'center', fontWeight: 700, color: '#166534' }}>
                                  +{inw.quantity_received}
                                </td>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{inw.supplier_name}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--color-forest)' }}>Bill: #{inw.supplier_bill_no}</div>
                                  {inw.has_discrepancy && (
                                    <div>
                                      <div style={{ fontSize: '10.5px', color: '#B45309', marginTop: '2px', fontWeight: 600 }}>
                                        Shortage: {inw.discrepancy_qty} units (Billed {inw.billed_qty})
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAuditTrayTab('VENDOR_CLAIMS');
                                          loadVendorClaims(claimFilter);
                                        }}
                                        className="btn btn-ghost btn-xs"
                                        style={{
                                          fontSize: '10px',
                                          color: '#991B1B',
                                          backgroundColor: '#FEF2F2',
                                          border: '1px solid #FCA5A5',
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                          marginTop: '3px',
                                          cursor: 'pointer'
                                        }}
                                        title="Jump to Vendor Debit Claims Tray"
                                      >
                                        View in Vendor Debit Claims
                                      </button>
                                    </div>
                                  )}
                                  {inw.free_items && inw.free_items.length > 0 && (
                                    <div style={{ fontSize: '10.5px', color: '#1E40AF', marginTop: '2px', fontWeight: 600 }}>
                                      Free Gifts: {inw.free_items.map(f => `${f.quantity}x ${f.item_name}`).join(', ')}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <span style={{ fontSize: '12px', fontWeight: 600 }}>{inw.received_by_name}</span>
                                </td>
                                <td>
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 600,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: inw.authorization_type === 'EMERGENCY_OVERRIDE' ? '#FFEDD5' : inw.authorization_type === 'SMS_OTP' ? '#EDE9FE' : '#E0E7FF',
                                      color: inw.authorization_type === 'EMERGENCY_OVERRIDE' ? '#C2410C' : inw.authorization_type === 'SMS_OTP' ? '#5B21B6' : '#3730A3'
                                    }}
                                  >
                                    {inw.authorization_type}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div>
                                    <span
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: isVerified ? '#DCFCE7' : isDiscrepancy ? '#FEE2E2' : '#FEF3C7',
                                        color: isVerified ? '#166534' : isDiscrepancy ? '#991B1B' : '#92400E',
                                        display: 'inline-block'
                                      }}
                                    >
                                      {isVerified ? 'Verified' : isDiscrepancy ? `Shortage (${inw.discrepancy_qty})` : 'Pending Audit'}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => setSelectedInwardForTimeline(inw)}
                                    className="btn btn-ghost btn-xs"
                                    style={{ fontSize: '10.5px', color: '#2563EB', textDecoration: 'underline', padding: '2px 4px', marginTop: '2px' }}
                                    title="View complete chronological audit trail"
                                  >
                                    Audit Trail ({inw.audit_timeline?.length || 1})
                                  </button>
                                </td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', paddingRight: '14px' }}>
                                  {isAdmin ? (
                                    isPending ? (
                                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                        <button
                                          onClick={() => handleAuditAction(inw.id, 'VERIFY')}
                                          className="btn btn-xs"
                                          style={{ backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', fontWeight: 600 }}
                                          title="Verify supplier bill matches physical receipt"
                                        >
                                          Verify
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedInwardForDiscrepancy(inw);
                                            setDiscrepancyActualQty(String(inw.quantity_received));
                                            setDiscrepancyNotes('');
                                          }}
                                          className="btn btn-xs"
                                          style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', fontWeight: 600 }}
                                          title="Flag shortage on arrival"
                                        >
                                          Flag Shortage
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedInwardForRecount(inw);
                                            setRecountCorrectedQty(String(inw.billed_qty || inw.quantity_received));
                                            setRecountNotes('');
                                          }}
                                          className="btn btn-xs"
                                          style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE', fontWeight: 600 }}
                                          title="Recount physical inventory and adjust stock"
                                        >
                                          Recount
                                        </button>
                                      </div>
                                    ) : isDiscrepancy ? (
                                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                        {inw.admin_decision !== 'ACCEPTED' && (
                                          <button
                                            onClick={() => {
                                              setSelectedInwardForDecision(inw);
                                              setDecisionActionType('ACCEPT_EXPLANATION');
                                              setDecisionNotesInput('');
                                            }}
                                            className="btn btn-xs"
                                            style={{ backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', fontWeight: 600 }}
                                            title="Accept shortage: supplier defect verified, creates Vendor Debit Claim"
                                          >
                                            Accept Shortage
                                          </button>
                                        )}
                                        {inw.admin_decision !== 'REJECTED' && (
                                          <button
                                            onClick={() => {
                                              setSelectedInwardForDecision(inw);
                                              setDecisionActionType('REJECT_EXPLANATION');
                                              setDecisionNotesInput('');
                                            }}
                                            className="btn btn-xs"
                                            style={{ backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', fontWeight: 600 }}
                                            title="Reject stockist statement: staff miscount"
                                          >
                                            Reject
                                          </button>
                                        )}
                                        <button
                                          onClick={() => {
                                            setSelectedInwardForRecount(inw);
                                            setRecountCorrectedQty(String(inw.billed_qty || inw.quantity_received));
                                            setRecountNotes('');
                                          }}
                                          className="btn btn-xs"
                                          style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE', fontWeight: 600 }}
                                          title="Recount physical stock & adjust inventory"
                                        >
                                          Recount &amp; Resolve
                                        </button>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                        <span
                                          style={{
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            backgroundColor: inw.admin_decision === 'REJECTED' ? '#FEE2E2' : '#DCFCE7',
                                            color: inw.admin_decision === 'REJECTED' ? '#991B1B' : '#166534',
                                            whiteSpace: 'nowrap'
                                          }}
                                        >
                                          Audited by {inw.audited_by_name || (inw.audited_by === 'admin' ? 'Admin' : inw.audited_by || 'Admin')}
                                          {inw.admin_decision === 'RESOLVED_RECOUNT' && ' (Recounted)'}
                                        </span>
                                        <button
                                          onClick={() => {
                                            setSelectedInwardForRecount(inw);
                                            setRecountCorrectedQty(String(inw.billed_qty || inw.quantity_received));
                                            setRecountNotes('');
                                          }}
                                          className="btn btn-ghost btn-xs"
                                          style={{ fontSize: '10.5px', color: '#6B7280', padding: '2px 6px' }}
                                          title="Recount stock if physical correction needed"
                                        >
                                          Recount
                                        </button>
                                      </div>
                                    )
                                  ) : (
                                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                      {inw.stockist_appeal_needed ? (
                                        <button
                                          onClick={() => {
                                            setSelectedInwardForStatement(inw);
                                            setStockistStatementInput('');
                                          }}
                                          className="btn btn-xs"
                                          style={{ backgroundColor: '#DC2626', color: '#FFFFFF', border: '1px solid #DC2626', fontWeight: 600, padding: '3px 8px' }}
                                          title="Owner disputed your count. Submit appeal / clarification"
                                        >
                                          Submit Appeal
                                        </button>
                                      ) : inw.admin_review_pending ? (
                                        <span style={{ fontSize: '11px', color: '#1E40AF', backgroundColor: '#DBEAFE', padding: '3px 8px', borderRadius: '10px', fontWeight: 600 }}>
                                          Appeal Under Review
                                        </span>
                                      ) : inw.has_discrepancy && !inw.stockist_statement ? (
                                        <button
                                          onClick={() => {
                                            setSelectedInwardForStatement(inw);
                                            setStockistStatementInput(inw.stockist_remarks || '');
                                          }}
                                          className="btn btn-xs"
                                          style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', fontWeight: 600, padding: '3px 8px' }}
                                        >
                                          Submit Statement
                                        </button>
                                      ) : isVerified ? (
                                        <span style={{ fontSize: '11px', color: '#166534', fontWeight: 600, backgroundColor: '#DCFCE7', padding: '3px 8px', borderRadius: '10px' }}>
                                          Audited &amp; Verified
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>
                                          Statement Filed
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: VENDOR DEBIT CLAIMS (SHORTAGE TRACKER) */}
              {auditTrayTab === 'VENDOR_CLAIMS' && (
                <div>
                  {/* KPI Summary Banner */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>
                        Pending Supplier Deductions
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#991B1B', marginTop: '4px' }}>
                        ₹{claimsSummary.pending_total}
                      </div>
                      <div style={{ fontSize: '11px', color: '#B91C1C' }}>
                        {claimsSummary.pending_count} active claims to deduct from upcoming vendor bills
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px 16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                        Total Settled Claims
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#166534', marginTop: '4px' }}>
                        ₹{claimsSummary.settled_total}
                      </div>
                      <div style={{ fontSize: '11px', color: '#15803D' }}>
                        Successfully recovered via credit notes &amp; bill deductions
                      </div>
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[
                        { id: 'all', label: 'All Claims' },
                        { id: 'PENDING_SETTLEMENT', label: 'Pending Settlement' },
                        { id: 'SETTLED', label: 'Settled' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setClaimFilter(tab.id);
                            loadVendorClaims(tab.id);
                          }}
                          className={`btn btn-xs ${claimFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                      {vendorClaims.length} records
                    </div>
                  </div>

                  {claimsLoading ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)' }}>
                      Loading vendor claims...
                    </div>
                  ) : vendorClaims.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)', backgroundColor: '#F8F6F0', borderRadius: '6px' }}>
                      No vendor debit claims found for this filter.
                    </div>
                  ) : (
                    <div className="ledger-table-container" style={{ border: '1px solid var(--color-stone-light)', borderRadius: '8px', overflowX: 'auto', maxHeight: '52vh' }}>
                      <table className="ledger-table" style={{ width: '100%', minWidth: '950px' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '130px' }}>Claim ID &amp; Date</th>
                            <th style={{ minWidth: '160px' }}>Supplier &amp; Bill #</th>
                            <th style={{ minWidth: '160px' }}>Missing Product</th>
                            <th style={{ width: '90px', textAlign: 'center' }}>Shortage Qty</th>
                            <th style={{ width: '90px', textAlign: 'right' }}>Unit Cost</th>
                            <th style={{ width: '110px', textAlign: 'right' }}>Claim Amount</th>
                            <th style={{ width: '140px', textAlign: 'center' }}>Status</th>
                            <th style={{ width: '160px', textAlign: 'right', paddingRight: '14px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendorClaims.map((c) => {
                            const isPending = c.status === 'PENDING_SETTLEMENT';
                            return (
                              <tr key={c.id || c.claim_id}>
                                <td style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0F172A' }}>{c.claim_id}</div>
                                  <div>{new Date(c.created_at).toLocaleDateString('en-IN')}</div>
                                </td>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{c.supplier_name}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--color-forest)' }}>Bill: #{c.supplier_bill_no}</div>
                                </td>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{c.product_name}</div>
                                  <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>{c.sku}</div>
                                </td>
                                <td className="tabular-nums" style={{ textAlign: 'center', fontWeight: 700, color: '#991B1B' }}>
                                  -{c.shortage_qty}
                                </td>
                                <td className="tabular-nums" style={{ textAlign: 'right' }}>
                                  ₹{c.unit_cost}
                                </td>
                                <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 800, color: '#991B1B' }}>
                                  ₹{c.claim_amount}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      backgroundColor: isPending ? '#FEE2E2' : '#DCFCE7',
                                      color: isPending ? '#991B1B' : '#166534'
                                    }}
                                  >
                                    {isPending ? 'Pending Deduction' : 'Settled'}
                                  </span>
                                  {!isPending && c.settlement_type && (
                                    <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                                      {c.settlement_type.replace(/_/g, ' ')}
                                      {c.settlement_ref ? ` (${c.settlement_ref})` : ''}
                                    </div>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: '14px' }}>
                                  {isPending && isAdmin ? (
                                    <button
                                      onClick={() => {
                                        setSelectedClaimForSettle(c);
                                        setSettleType('DEDUCTED_FROM_BILL');
                                        setSettleRef('');
                                        setSettleNotes('');
                                      }}
                                      className="btn btn-xs"
                                      style={{ backgroundColor: '#166534', color: '#FFFFFF', border: '1px solid #166534', fontWeight: 600 }}
                                    >
                                      Settle / Deduct
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                                      {isPending ? 'Pending Owner' : 'Cleared'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PROMOTIONAL & FESTIVAL GIFT VAULT */}
              {auditTrayTab === 'GIFT_VAULT' && (
                <div>
                  {/* KPI Summary Banner */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '6px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>
                        Pending Allocation
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#92400E', marginTop: '2px' }}>
                        {giftsSummary.pending_allocation_count}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#B45309' }}>Awaiting Owner routing</div>
                    </div>
                    <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase' }}>
                        Customer Schemes
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#1E40AF', marginTop: '2px' }}>
                        {giftsSummary.active_schemes_count}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#1E3A8A' }}>Active bundle bonuses</div>
                    </div>
                    <div style={{ backgroundColor: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: '6px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B21A8', textTransform: 'uppercase' }}>
                        Festival &amp; Diwali Vault
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#6B21A8', marginTop: '2px' }}>
                        {giftsSummary.festival_vault_count}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#581C87' }}>Client relations gifts</div>
                    </div>
                    <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                        Store / Owner Assets
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#166534', marginTop: '2px' }}>
                        {giftsSummary.store_assets_count}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#15803D' }}>Shop utility items</div>
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[
                        { id: 'all', label: 'All Gifts' },
                        { id: 'PENDING_ADMIN_ALLOCATION', label: 'Pending Allocation' },
                        { id: 'CUSTOMER_PROMO_SCHEME', label: 'Customer Schemes' },
                        { id: 'FESTIVAL_DIWALI_VAULT', label: 'Diwali & Festival Vault' },
                        { id: 'OWNER_STORE_ASSET', label: 'Store Assets' },
                        { id: 'SELLABLE_STOCK', label: 'Sellable Stock' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setGiftFilter(tab.id);
                            loadPromotionalGifts(tab.id);
                          }}
                          className={`btn btn-xs ${giftFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                      {promotionalGifts.length} items
                    </div>
                  </div>

                  {giftsLoading ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)' }}>
                      Loading promotional gift vault...
                    </div>
                  ) : promotionalGifts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)', backgroundColor: '#F8F6F0', borderRadius: '6px' }}>
                      No promotional gift items recorded yet.
                    </div>
                  ) : (
                    <div className="ledger-table-container" style={{ border: '1px solid var(--color-stone-light)', borderRadius: '8px', overflowX: 'auto', maxHeight: '52vh' }}>
                      <table className="ledger-table" style={{ width: '100%', minWidth: '950px' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '180px' }}>Gift Item &amp; Qty</th>
                            <th style={{ minWidth: '160px' }}>Source Shipment</th>
                            <th style={{ width: '150px' }}>Allocation Type</th>
                            <th style={{ minWidth: '220px' }}>Scheme Rule / Recipient Notes</th>
                            <th style={{ width: '140px', textAlign: 'right', paddingRight: '14px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {promotionalGifts.map((g) => {
                            const isPending = g.status === 'PENDING_ADMIN_ALLOCATION';
                            const isScheme = g.allocation_type === 'CUSTOMER_PROMO_SCHEME';
                            const isVault = g.allocation_type === 'FESTIVAL_DIWALI_VAULT';
                            const isAsset = g.allocation_type === 'OWNER_STORE_ASSET';
                            const isSellable = g.allocation_type === 'SELLABLE_STOCK';

                            return (
                              <tr key={g.id || g.gift_id}>
                                <td>
                                  <div style={{ fontWeight: 700, color: '#0F172A' }}>{g.item_name}</div>
                                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>
                                    Total: {g.quantity} Pcs {g.remaining_qty !== undefined && g.remaining_qty < g.quantity ? `(${g.remaining_qty} remaining)` : ''}
                                  </div>
                                  {g.challan_reference && (
                                    <div style={{ fontSize: '10.5px', color: '#64748B', fontStyle: 'italic' }}>
                                      Ref: {g.challan_reference}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{g.supplier_name}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--color-forest)' }}>Bill: #{g.supplier_bill_no}</div>
                                  <div style={{ fontSize: '10.5px', color: 'var(--color-muted)' }}>Received by {g.received_by_name}</div>
                                </td>
                                <td>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      backgroundColor: isPending ? '#FEF3C7' : isScheme ? '#DBEAFE' : isVault ? '#F3E8FF' : isAsset ? '#DCFCE7' : '#CCFBF1',
                                      color: isPending ? '#92400E' : isScheme ? '#1E40AF' : isVault ? '#6B21A8' : isAsset ? '#166534' : '#0F766E'
                                    }}
                                  >
                                    {isPending ? 'Pending Owner Routing' : g.allocation_type.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td style={{ fontSize: '11.5px' }}>
                                  {isScheme && g.scheme_rule && (
                                    <div>
                                      <span style={{ fontWeight: 600, color: '#1E40AF' }}>Rule:</span> Buy {g.scheme_rule.min_purchase_qty}x {g.scheme_rule.target_product_name || 'Units'} &rarr; Get 1 Free
                                    </div>
                                  )}
                                  {isVault && g.vault_details && (
                                    <div>
                                      <div><span style={{ fontWeight: 600 }}>Reserved For:</span> {g.vault_details.person_name} {g.vault_details.contact ? `(${g.vault_details.contact})` : ''}</div>
                                      {g.vault_details.vault_notes && (
                                        <div style={{ fontStyle: 'italic', color: '#64748B' }}>"{g.vault_details.vault_notes}"</div>
                                      )}
                                      <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: g.vault_details.vault_status === 'HANDED_OVER' ? '#DCFCE7' : '#FEF3C7', color: g.vault_details.vault_status === 'HANDED_OVER' ? '#166534' : '#92400E' }}>
                                        {g.vault_details.vault_status || 'RESERVED'}
                                      </span>
                                    </div>
                                  )}
                                  {isAsset && (
                                    <div style={{ color: '#166534' }}>
                                      Store Owner / Shop Internal Asset (Not for Sale)
                                    </div>
                                  )}
                                  {isSellable && (
                                    <div style={{ color: '#0F766E' }}>
                                      Added to active stock at ₹0 purchase cost
                                    </div>
                                  )}
                                  {isPending && (
                                    <div style={{ color: '#B45309', fontStyle: 'italic' }}>
                                      Awaiting Store Owner Decision
                                    </div>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: '14px' }}>
                                  {isAdmin ? (
                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                      <button
                                        onClick={() => {
                                          setSelectedGiftForAllocation(g);
                                          setGiftAllocType('CUSTOMER_PROMO_SCHEME');
                                          setGiftMinQty('2');
                                          setGiftTargetProdId(g.product_id ? String(g.product_id) : '');
                                          setGiftPersonName('');
                                          setGiftContact('');
                                          setGiftVaultNotes('');
                                          setGiftSellingPrice('');
                                        }}
                                        className="btn btn-xs"
                                        style={{ backgroundColor: '#1E40AF', color: '#FFFFFF', border: '1px solid #1E40AF', fontWeight: 600 }}
                                      >
                                        {isPending ? 'Assign Allocation' : 'Reallocate'}
                                      </button>
                                      {isVault && g.vault_details?.vault_status !== 'HANDED_OVER' && (
                                        <button
                                          onClick={() => {
                                            setSelectedGiftForHandover(g);
                                            setHandoverRecipient(g.vault_details?.person_name || '');
                                            setHandoverNotes('');
                                          }}
                                          className="btn btn-xs"
                                          style={{ backgroundColor: '#166534', color: '#FFFFFF', border: '1px solid #166534', fontWeight: 600 }}
                                        >
                                          Mark Handed Over
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                                      Logged
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowAuditTrayModal(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Vendor Debit Claim Modal */}
      {selectedClaimForSettle && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-sheet" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '15px', color: '#991B1B' }}>Settle Vendor Shortage Claim</h3>
              <button onClick={() => setSelectedClaimForSettle(null)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleSettleClaim}>
              <div className="modal-body">
                <div style={{ fontSize: '12.5px', marginBottom: '12px', backgroundColor: '#FEF2F2', padding: '10px', borderRadius: '6px' }}>
                  Supplier: <b>{selectedClaimForSettle.supplier_name}</b> (Bill #{selectedClaimForSettle.supplier_bill_no})
                  <br />
                  Item Short: <b>{selectedClaimForSettle.shortage_qty} units of {selectedClaimForSettle.product_name}</b>
                  <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: 800, color: '#991B1B' }}>
                    Total Claim Amount: ₹{selectedClaimForSettle.claim_amount}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Settlement Method *</label>
                  <select
                    className="form-select"
                    value={settleType}
                    onChange={(e) => setSettleType(e.target.value)}
                  >
                    <option value="DEDUCTED_FROM_BILL">Deducted from Supplier Bill Payment</option>
                    <option value="CREDIT_NOTE_RECEIVED">Supplier Issued Credit Note</option>
                    <option value="CASH_REFUND">Cash / Bank Transfer Refund</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment / Credit Note Reference Voucher</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Deducted on Payment VCH-8891 or CN-4402"
                    value={settleRef}
                    onChange={(e) => setSettleRef(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Settlement Notes (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Agreed with vendor representative on phone"
                    value={settleNotes}
                    onChange={(e) => setSettleNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setSelectedClaimForSettle(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={settlingClaim} className="btn btn-primary" style={{ backgroundColor: '#166534', borderColor: '#166534' }}>
                  {settlingClaim ? 'Recording...' : 'Confirm Claim Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Gift Allocation Modal */}
      {selectedGiftForAllocation && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-sheet" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '15px', color: '#1E40AF' }}>
                Allocate Promotional Gift (Store Owner)
              </h3>
              <button onClick={() => setSelectedGiftForAllocation(null)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleAllocateGift}>
              <div className="modal-body">
                <div style={{ fontSize: '12.5px', marginBottom: '12px', backgroundColor: '#EFF6FF', padding: '10px', borderRadius: '6px' }}>
                  Gift: <b>{selectedGiftForAllocation.quantity}x {selectedGiftForAllocation.item_name}</b>
                  <br />
                  From: <b>{selectedGiftForAllocation.supplier_name}</b> (Bill #{selectedGiftForAllocation.supplier_bill_no})
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Choose Gift Allocation / Destination *</label>
                  <select
                    className="form-select"
                    value={giftAllocType}
                    onChange={(e) => setGiftAllocType(e.target.value)}
                  >
                    <option value="CUSTOMER_PROMO_SCHEME">Customer Promotional Scheme (Bundle Condition)</option>
                    <option value="FESTIVAL_DIWALI_VAULT">Festival &amp; Diwali Vault (Client &amp; VIP Relations)</option>
                    <option value="OWNER_STORE_ASSET">Store Owner / Shop Internal Asset (Not for Sale)</option>
                    <option value="SELLABLE_STOCK">Sellable Inventory Stock (₹0 Purchase Cost)</option>
                  </select>
                </div>

                {giftAllocType === 'CUSTOMER_PROMO_SCHEME' && (
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 12px', borderRadius: '6px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF', marginBottom: '6px' }}>
                      Scheme Condition Rule (Customer Bonus at Billing)
                    </div>
                    <div className="form-group" style={{ marginBottom: '8px' }}>
                      <label className="form-label">Minimum Purchase Quantity *</label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        required
                        className="form-input"
                        placeholder="e.g. 2 (Boxes/Units)"
                        value={giftMinQty}
                        onChange={(e) => setGiftMinQty(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Qualifying Product</label>
                      <select
                        className="form-select"
                        value={giftTargetProdId}
                        onChange={(e) => setGiftTargetProdId(e.target.value)}
                      >
                        <option value="">Any or Same Shipment Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>
                      When a customer buys {giftMinQty || 1} units on the invoice screen, this gift will be suggested as a free scheme item.
                    </div>
                  </div>
                )}

                {giftAllocType === 'FESTIVAL_DIWALI_VAULT' && (
                  <div style={{ backgroundColor: '#FAF5FF', border: '1px solid #E9D5FF', padding: '10px 12px', borderRadius: '6px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B21A8', marginBottom: '6px' }}>
                      Festival &amp; Client Relations Registry
                    </div>
                    <div className="form-group" style={{ marginBottom: '8px' }}>
                      <label className="form-label">Reserved For Person / Organization *</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="e.g. Dr. Rajesh Sharma, City Hospital"
                        value={giftPersonName}
                        onChange={(e) => setGiftPersonName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '8px' }}>
                      <label className="form-label">Contact Number (Optional)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 9876543210"
                        value={giftContact}
                        onChange={(e) => setGiftContact(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Festival / Conversation Notes *</label>
                      <textarea
                        rows={2}
                        required
                        className="form-input"
                        placeholder="e.g. Spoke on 4th Nov; promised for Diwali visit."
                        value={giftVaultNotes}
                        onChange={(e) => setGiftVaultNotes(e.target.value)}
                        style={{ fontSize: '12px' }}
                      />
                    </div>
                  </div>
                )}

                {giftAllocType === 'OWNER_STORE_ASSET' && (
                  <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '10px 12px', borderRadius: '6px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11.5px', color: '#166534' }}>
                      This item will be cataloged in the Store Asset Register for store or personal use (e.g., umbrella, desk stand, promotional display). It cannot be sold or removed by staff.
                    </div>
                  </div>
                )}

                {giftAllocType === 'SELLABLE_STOCK' && (
                  <div style={{ backgroundColor: '#F0FDFA', border: '1px solid #99F6E4', padding: '10px 12px', borderRadius: '6px', marginBottom: '10px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Selling Price (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        className="form-input"
                        placeholder="e.g. 50.00"
                        value={giftSellingPrice}
                        onChange={(e) => setGiftSellingPrice(e.target.value)}
                      />
                      <div style={{ fontSize: '11px', color: '#0F766E', marginTop: '4px' }}>
                        Stock will be added at ₹0 purchase cost, giving 100% margin upon retail sale.
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setSelectedGiftForAllocation(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submittingAlloc} className="btn btn-primary">
                  {submittingAlloc ? 'Saving...' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Festival Gift Handover Modal */}
      {selectedGiftForHandover && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-sheet" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '15px', color: '#166534' }}>Mark Festival Gift Handed Over</h3>
              <button onClick={() => setSelectedGiftForHandover(null)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleVaultAction}>
              <div className="modal-body">
                <div style={{ fontSize: '12.5px', marginBottom: '12px', backgroundColor: '#F0FDF4', padding: '10px', borderRadius: '6px' }}>
                  Gift: <b>{selectedGiftForHandover.item_name}</b>
                  <br />
                  Reserved for: <b>{selectedGiftForHandover.vault_details?.person_name}</b>
                </div>

                <div className="form-group">
                  <label className="form-label">Recipient Name / Receiver *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={handoverRecipient}
                    onChange={(e) => setHandoverRecipient(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Handover Confirmation Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Handed over in person during Diwali visit"
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setSelectedGiftForHandover(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submittingHandover} className="btn btn-primary" style={{ backgroundColor: '#166534', borderColor: '#166534' }}>
                  {submittingHandover ? 'Updating...' : 'Confirm Handed Over'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Chronological Audit Trail Modal */}
      {selectedInwardForTimeline && (
        <div className="modal-backdrop" style={{ zIndex: 1150 }}>
          <div className="modal-sheet" style={{ maxWidth: '620px', width: '92vw' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0F172A' }}>
                  Audit Trail &amp; Delivery Timeline
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                  Immutable chronological log for Bill #{selectedInwardForTimeline.supplier_bill_no}
                </div>
              </div>
              <button onClick={() => setSelectedInwardForTimeline(null)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {/* Shipment Info Card */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '8px',
                  fontSize: '12px'
                }}
              >
                <div>
                  <div style={{ color: 'var(--color-muted)', fontSize: '10.5px' }}>PRODUCT</div>
                  <div style={{ fontWeight: 700 }}>{selectedInwardForTimeline.product_name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#64748B' }}>{selectedInwardForTimeline.sku}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--color-muted)', fontSize: '10.5px' }}>SUPPLIER</div>
                  <div style={{ fontWeight: 600 }}>{selectedInwardForTimeline.supplier_name}</div>
                  <div style={{ color: 'var(--color-forest)', fontSize: '11px' }}>Bill: #{selectedInwardForTimeline.supplier_bill_no}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--color-muted)', fontSize: '10.5px' }}>RECEIVED BY</div>
                  <div style={{ fontWeight: 600 }}>{selectedInwardForTimeline.received_by_name}</div>
                  <div style={{ fontSize: '10.5px', color: '#64748B' }}>{selectedInwardForTimeline.authorization_type}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--color-muted)', fontSize: '10.5px' }}>STATUS</div>
                  <div style={{ fontWeight: 700, color: selectedInwardForTimeline.status === 'VERIFIED' ? '#166534' : selectedInwardForTimeline.status === 'FLAGGED_DISCREPANCY' ? '#991B1B' : '#B45309' }}>
                    {selectedInwardForTimeline.status}
                  </div>
                  {selectedInwardForTimeline.has_discrepancy && (
                    <div style={{ fontSize: '11px', color: '#B45309' }}>
                      Shortage: {selectedInwardForTimeline.discrepancy_qty} units
                    </div>
                  )}
                </div>
              </div>

              {/* Vertical Timeline */}
              <div style={{ position: 'relative', paddingLeft: '24px' }}>
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    bottom: '8px',
                    left: '8px',
                    width: '2px',
                    backgroundColor: '#E2E8F0'
                  }}
                />

                {(selectedInwardForTimeline.audit_timeline || []).map((ev, idx) => {
                  const isArrival = ev.event_type === 'INWARD_LOGGED';
                  const isDiscrepancy = ev.event_type === 'DISCREPANCY_FLAGGED';
                  const isReject = ev.event_type === 'ADMIN_DECISION_REJECTED';
                  const isAccept = ev.event_type === 'ADMIN_DECISION_ACCEPTED';
                  const isAppeal = ev.event_type === 'STOCKIST_APPEAL' || ev.event_type === 'STOCKIST_STATEMENT';
                  const isRecount = ev.event_type === 'ADMIN_RECOUNT_RESOLVED';
                  const isVerified = ev.event_type === 'ADMIN_VERIFIED';

                  const dotColor = isArrival ? '#3B82F6' : isDiscrepancy || isReject ? '#DC2626' : isAccept || isVerified ? '#166534' : isRecount ? '#2563EB' : '#D97706';

                  return (
                    <div key={idx} style={{ position: 'relative', marginBottom: '16px' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: '-20px',
                          top: '4px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: dotColor,
                          border: '2px solid #FFFFFF',
                          boxShadow: '0 0 0 2px ' + dotColor
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                          {ev.action_title || ev.event_type}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          {new Date(ev.timestamp).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>
                        By: <span style={{ fontWeight: 600 }}>{ev.actor_name}</span> ({ev.actor_role})
                      </div>
                      {ev.notes && (
                        <div
                          style={{
                            fontSize: '12px',
                            backgroundColor: isReject ? '#FEF2F2' : isAccept ? '#F0FDF4' : isAppeal ? '#EFF6FF' : '#F8FAFC',
                            border: `1px solid ${isReject ? '#FECACA' : isAccept ? '#BBF7D0' : isAppeal ? '#BFDBFE' : '#E2E8F0'}`,
                            padding: '8px 10px',
                            borderRadius: '5px',
                            color: '#1E293B',
                            fontStyle: isAppeal ? 'italic' : 'normal'
                          }}
                        >
                          {ev.notes}
                        </div>
                      )}
                      {ev.details && Object.keys(ev.details).length > 0 && (
                        <div style={{ marginTop: '4px', fontSize: '11px', color: '#64748B' }}>
                          {ev.details.adjusted_delta !== undefined && (
                            <span style={{ fontWeight: 600, color: '#166534' }}>
                              Inventory Adjustment: {ev.details.adjusted_delta > 0 ? `+${ev.details.adjusted_delta}` : ev.details.adjusted_delta} units.
                            </span>
                          )}
                          {ev.details.received_qty !== undefined && (
                            <span> Received: {ev.details.received_qty} units</span>
                          )}
                          {ev.details.billed_qty !== undefined && (
                            <span> | Billed: {ev.details.billed_qty} units</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setSelectedInwardForTimeline(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discrepancy Recording Sub-Modal */}
      {selectedInwardForDiscrepancy && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-sheet" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '15px', color: '#991B1B' }}>Flag Delivery Discrepancy</h3>
              <button onClick={() => setSelectedInwardForDiscrepancy(null)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: '12.5px', marginBottom: '12px' }}>
                Item: <b>{selectedInwardForDiscrepancy.product_name}</b> (Bill #{selectedInwardForDiscrepancy.supplier_bill_no})
                <br />
                Logged by {selectedInwardForDiscrepancy.received_by_name}: <b>{selectedInwardForDiscrepancy.quantity_received} units</b>
              </div>

              <div className="form-group">
                <label className="form-label">Actual Quantity on Physical Supplier Bill *</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={discrepancyActualQty}
                  onChange={(e) => setDiscrepancyActualQty(e.target.value)}
                />
                {discrepancyActualQty && (
                  <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: 600, color: '#991B1B' }}>
                    Calculated Difference: {parseFloat(discrepancyActualQty) - selectedInwardForDiscrepancy.quantity_received} units shortage
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Audit Remarks / Justification</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Supplier challan shows 100, received carton only had 95."
                  value={discrepancyNotes}
                  onChange={(e) => setDiscrepancyNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setSelectedInwardForDiscrepancy(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => handleAuditAction(selectedInwardForDiscrepancy.id, 'DISCREPANCY', discrepancyActualQty, discrepancyNotes)}
                className="btn btn-primary"
                style={{ backgroundColor: '#DC2626', borderColor: '#DC2626' }}
              >
                Save Discrepancy Flag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Recount & Stock Correction Sub-Modal (Admin Only) */}
      {selectedInwardForRecount && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-sheet" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '15px', color: '#1E40AF' }}>Admin Recount & Stock Correction</h3>
              <button onClick={() => setSelectedInwardForRecount(null)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: '12.5px', marginBottom: '12px', backgroundColor: '#EFF6FF', padding: '10px', borderRadius: '6px' }}>
                Item: <b>{selectedInwardForRecount.product_name}</b> (Bill #{selectedInwardForRecount.supplier_bill_no})
                <br />
                Staff Logged: <b>{selectedInwardForRecount.quantity_received} units</b>
                {selectedInwardForRecount.billed_qty && (
                  <span> | Supplier Billed: <b>{selectedInwardForRecount.billed_qty} units</b></span>
                )}
                {selectedInwardForRecount.stockist_remarks && (
                  <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#1E40AF' }}>
                    Staff Remark: "{selectedInwardForRecount.stockist_remarks}"
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Actual Recounted Physical Quantity (Admin Verified) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  className="form-input"
                  value={recountCorrectedQty}
                  onChange={(e) => setRecountCorrectedQty(e.target.value)}
                />
                {recountCorrectedQty !== '' && (
                  <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: 600, color: parseFloat(recountCorrectedQty) - selectedInwardForRecount.quantity_received >= 0 ? '#166534' : '#991B1B' }}>
                    Inventory Adjustment: {parseFloat(recountCorrectedQty) - selectedInwardForRecount.quantity_received >= 0 ? '+' : ''}
                    {Math.round((parseFloat(recountCorrectedQty) - selectedInwardForRecount.quantity_received) * 1000) / 1000} units to active stock.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Admin Audit & Recount Justification *</label>
                <textarea
                  rows={2}
                  required
                  className="form-input"
                  placeholder="e.g. Physical carton recounted by Admin; verified 100 units received (staff miscounted inner packet)."
                  value={recountNotes}
                  onChange={(e) => setRecountNotes(e.target.value)}
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setSelectedInwardForRecount(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => handleAuditAction(selectedInwardForRecount.id, 'CORRECT_QUANTITY', null, recountNotes, recountCorrectedQty)}
                disabled={!recountCorrectedQty}
                className="btn btn-primary"
                style={{ backgroundColor: '#1E40AF', borderColor: '#1E40AF' }}
              >
                Apply Recount & Correct Inventory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stockist Explanation / Appeal Statement Modal (Staff / Stockist) */}
      {selectedInwardForStatement && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-sheet" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '15px', color: '#1E40AF' }}>
                {selectedInwardForStatement.admin_decision === 'REJECTED'
                  ? 'Submit Delivery Count Appeal'
                  : 'Stockist Inward Statement'}
              </h3>
              <button onClick={() => setSelectedInwardForStatement(null)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleStockistStatementSubmit}>
              <div className="modal-body">
                <div style={{ fontSize: '12.5px', marginBottom: '12px', backgroundColor: '#EFF6FF', padding: '10px', borderRadius: '6px' }}>
                  Item: <b>{selectedInwardForStatement.product_name}</b> (Bill #{selectedInwardForStatement.supplier_bill_no})
                  <br />
                  Quantity Received: <b>{selectedInwardForStatement.quantity_received} units</b>
                  {selectedInwardForStatement.billed_qty && (
                    <span> | Supplier Billed: <b>{selectedInwardForStatement.billed_qty} units</b></span>
                  )}
                  {selectedInwardForStatement.discrepancy_qty > 0 && (
                    <div style={{ color: '#991B1B', fontWeight: 600, marginTop: '3px' }}>
                      Shortage on Delivery: {selectedInwardForStatement.discrepancy_qty} units
                    </div>
                  )}
                  {selectedInwardForStatement.admin_decision_notes && (
                    <div style={{ color: '#991B1B', marginTop: '6px', fontSize: '11.5px', backgroundColor: '#FEE2E2', padding: '6px 8px', borderRadius: '4px' }}>
                      <b>Store Owner Dispute Note:</b> "{selectedInwardForStatement.admin_decision_notes}"
                    </div>
                  )}
                  {selectedInwardForStatement.audit_notes && !selectedInwardForStatement.admin_decision_notes && (
                    <div style={{ color: '#92400E', marginTop: '4px', fontSize: '11.5px' }}>
                      <b>Admin Audit Note:</b> "{selectedInwardForStatement.audit_notes}"
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    {selectedInwardForStatement.admin_decision === 'REJECTED'
                      ? 'Your Appeal / Counter-Clarification for Store Owner *'
                      : 'Stockist Explanation / Statement *'}
                  </label>
                  <textarea
                    rows={3}
                    required
                    minLength={3}
                    className="form-input"
                    placeholder={
                      selectedInwardForStatement.admin_decision === 'REJECTED'
                        ? 'Clarify physical carton count or request an in-person carton recount by the Store Owner.'
                        : 'Explain the shortage or delivery condition (e.g. carton seal broken, inner box short).'
                    }
                    value={stockistStatementInput}
                    onChange={(e) => setStockistStatementInput(e.target.value)}
                    style={{ fontSize: '12px' }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                    Once submitted, your statement is permanently recorded in the immutable audit trail and sent to the Store Owner.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setSelectedInwardForStatement(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submittingStatement} className="btn btn-primary" style={{ backgroundColor: '#1E40AF', borderColor: '#1E40AF' }}>
                  {submittingStatement
                    ? 'Submitting...'
                    : selectedInwardForStatement.admin_decision === 'REJECTED'
                    ? 'Submit Appeal to Store Owner'
                    : 'Submit Statement for Admin Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Statement Decision Modal (Accept / Reject) */}
      {selectedInwardForDecision && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-sheet" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '15px', color: decisionActionType === 'ACCEPT_EXPLANATION' ? '#166534' : '#991B1B' }}>
                {decisionActionType === 'ACCEPT_EXPLANATION' ? 'Accept Stockist Statement' : 'Reject Stockist Statement'}
              </h3>
              <button onClick={() => setSelectedInwardForDecision(null)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleAdminDecisionSubmit}>
              <div className="modal-body">
                <div style={{ fontSize: '12.5px', marginBottom: '12px', backgroundColor: decisionActionType === 'ACCEPT_EXPLANATION' ? '#DCFCE7' : '#FEE2E2', padding: '10px', borderRadius: '6px' }}>
                  Item: <b>{selectedInwardForDecision.product_name}</b> (Bill #{selectedInwardForDecision.supplier_bill_no})
                  <br />
                  Staff: <b>{selectedInwardForDecision.received_by_name}</b> (Received: {selectedInwardForDecision.quantity_received}, Billed: {selectedInwardForDecision.billed_qty || selectedInwardForDecision.quantity_received})
                  {(selectedInwardForDecision.stockist_statement || selectedInwardForDecision.stockist_remarks) && (
                    <div style={{ marginTop: '6px', fontStyle: 'italic', color: '#1E3A8A' }}>
                      <b>Staff Statement:</b> "{selectedInwardForDecision.stockist_statement || selectedInwardForDecision.stockist_remarks}"
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    {decisionActionType === 'ACCEPT_EXPLANATION' ? 'Acceptance Justification (Optional)' : 'Rejection Reason / Miscount Notes *'}
                  </label>
                  <textarea
                    rows={2}
                    required={decisionActionType === 'REJECT_EXPLANATION'}
                    className="form-input"
                    placeholder={
                      decisionActionType === 'ACCEPT_EXPLANATION'
                        ? 'e.g. Verified with supplier challan. Shortage is genuine vendor defect; staff count is accurate.'
                        : 'e.g. Recounted carton; staff miscounted 5 units in inner box. Error charged to staff audit performance.'
                    }
                    value={decisionNotesInput}
                    onChange={(e) => setDecisionNotesInput(e.target.value)}
                    style={{ fontSize: '12px' }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                    {decisionActionType === 'ACCEPT_EXPLANATION'
                      ? 'Accepting will mark inward as Verified and add +1 to staff accuracy score.'
                      : 'Rejecting will flag a counting error and lower the staff accuracy score.'}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setSelectedInwardForDecision(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDecision}
                  className="btn btn-primary"
                  style={{
                    backgroundColor: decisionActionType === 'ACCEPT_EXPLANATION' ? '#166534' : '#DC2626',
                    borderColor: decisionActionType === 'ACCEPT_EXPLANATION' ? '#166534' : '#DC2626'
                  }}
                >
                  {submittingDecision
                    ? 'Recording...'
                    : decisionActionType === 'ACCEPT_EXPLANATION'
                    ? 'Confirm Acceptance (+ Accuracy)'
                    : 'Confirm Rejection (- Accuracy)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Movements Audit Ledger Modal */}
      {showLedgerModal && (
        <div className="modal-backdrop">
          <div className="modal-sheet modal-sheet-lg">
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '16px' }}>Stock Movement Audit Ledger</h3>
              <button onClick={() => setShowLedgerModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh' }}>
              {stockLedger.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)' }}>
                  No movement records found.
                </div>
              ) : (
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Type</th>
                      <th style={{ textAlign: 'center' }}>Change</th>
                      <th style={{ textAlign: 'center' }}>New Balance</th>
                      <th>Reference</th>
                      <th>User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockLedger.map((m, idx) => (
                      <tr key={idx}>
                        <td style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                          {new Date(m.created_at).toLocaleString('en-IN')}
                        </td>
                        <td style={{ fontWeight: 600 }}>{m.product_name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{m.sku}</td>
                        <td>
                          <span style={{ fontSize: '11px', fontWeight: 700 }}>{m.movement_type}</span>
                        </td>
                        <td
                          className="tabular-nums"
                          style={{
                            textAlign: 'center',
                            fontWeight: 700,
                            color: m.quantity_delta < 0 ? '#991B1B' : '#1D603A'
                          }}
                        >
                          {m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta}
                        </td>
                        <td className="tabular-nums" style={{ textAlign: 'center', fontWeight: 600 }}>
                          {m.stock_after}
                        </td>
                        <td style={{ fontSize: '12px' }}>{m.reference}</td>
                        <td style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{m.created_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowLedgerModal(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
