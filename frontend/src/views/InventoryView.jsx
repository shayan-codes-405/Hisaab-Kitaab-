import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const InventoryView = () => {
  const { apiFetch, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const loadProducts = async () => {
    setLoading(true);
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

  useEffect(() => {
    loadProducts();
  }, [categoryFilter, statusFilter]);

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

  return (
    <div>
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
              Stock Ledger 📋
            </button>

            <button onClick={openAddModal} className="btn btn-primary">
              <span>+</span> Add Product
            </button>
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
              <th style={{ textAlign: 'right' }}>Cost Price</th>
              <th style={{ textAlign: 'right' }}>Selling Price</th>
              <th style={{ textAlign: 'center' }}>Stock Available</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th className="table-sticky-actions" style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)' }}>
                  Loading inventory catalog from MongoDB...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)' }}>
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
                    <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--color-muted)' }}>
                      ₹{p.purchase_price.toFixed(2)}
                    </td>
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
                        <button
                          onClick={() => {
                            setRestockProduct(p);
                            setRestockQty(10);
                            setShowRestockModal(true);
                          }}
                          title="Quick Restock"
                          className="btn btn-secondary btn-xs"
                        >
                          + Restock
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
                    <span>📦</span> Packaging & Multi-Unit Mode
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
                        <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--color-forest)' }}>📦 Box / Pack with Multiple Pieces</div>
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
                          ✓ Formula: 1 {pkgUnit || 'Box'} = {pkgQty || 10} {looseUnit || 'Pcs'}
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
                          📊 Total Stock: <b>{formData.stock_qty || 0} {looseUnit || 'Pcs'}</b>
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

      {/* Quick Restock Modal */}
      {showRestockModal && restockProduct && (
        <div className="modal-backdrop">
          <div className="modal-sheet" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '15px' }}>Quick Restock: {restockProduct.name}</h3>
              <button onClick={() => setShowRestockModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleRestockSubmit}>
              <div className="modal-body">
                <div style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '14px' }}>
                  Current Stock: <b>{restockProduct.stock_qty} {restockProduct.unit}</b>
                  {restockProduct.package_unit && restockProduct.package_qty > 1 && (
                    <span style={{ color: 'var(--color-forest)', fontWeight: 600 }}>
                      {' '}(≈ {(restockProduct.stock_qty / restockProduct.package_qty).toFixed(1)} {restockProduct.package_unit}s)
                    </span>
                  )}
                </div>

                {restockProduct.package_unit && restockProduct.package_qty > 1 && (
                  <div style={{ display: 'flex', gap: '14px', marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="radio" checked={restockUnitType === 'pkg'} onChange={() => setRestockUnitType('pkg')} />
                      Restock in {restockProduct.package_unit}s
                    </label>
                    <label style={{ fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="radio" checked={restockUnitType === 'base'} onChange={() => setRestockUnitType('base')} />
                      Restock in {restockProduct.unit} (Loose)
                    </label>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    Quantity to Add ({restockProduct.package_unit && restockUnitType === 'pkg' ? restockProduct.package_unit + 's' : restockProduct.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    required
                    className="form-input"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                  />
                  {restockProduct.package_unit && restockProduct.package_qty > 1 && restockUnitType === 'pkg' && (
                    <div style={{ fontSize: '11px', color: 'var(--color-forest)', fontWeight: 600, marginTop: '4px' }}>
                      = +{(parseFloat(restockQty) || 0) * restockProduct.package_qty} {restockProduct.unit} will be added to inventory stock.
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowRestockModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-copper">
                  Confirm Restock
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
