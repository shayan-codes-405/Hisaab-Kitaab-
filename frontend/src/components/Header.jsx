import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { STATES_LIST, UT_LIST } from '../constants/states';

export const Header = ({ activeTab, onNewInvoice, onNewProduct, onOpenAdminModal, onToggleMobileSidebar }) => {
  const { business, businesses, switchBusiness, createBusiness, fetchBusinesses, isAdmin, user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const dateInputRef = useRef(null);

  // Store Switcher & New Store Modal State
  const [showStoreSwitcher, setShowStoreSwitcher] = useState(false);
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [isSubmittingStore, setIsSubmittingStore] = useState(false);
  const [newStoreForm, setNewStoreForm] = useState({
    business_name: '',
    business_category: 'stationery',
    phone: '',
    state: 'Maharashtra',
    gstin: '',
    address: ''
  });

  const switcherRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setShowStoreSwitcher(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getTabTitle = () => {
    if (activeTab === 'invoice') return 'Invoices';
    if (activeTab === 'inventory') return 'Inventory & Stock';
    if (activeTab === 'dashboard') return 'Dashboard';
    return 'HisabKitab';
  };

  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(selectedDate));

  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const handleOpenCalendar = () => {
    if (dateInputRef.current) {
      try {
        if (typeof dateInputRef.current.showPicker === 'function') {
          dateInputRef.current.showPicker();
        } else {
          dateInputRef.current.focus();
        }
      } catch (err) {
        dateInputRef.current.focus();
      }
    }
  };

  // Stock persons (inventory_manager) MUST NOT have invoicing access
  const canIssueInvoice = isAdmin || user?.role === 'staff';

  const handleCreateNewStore = async (e) => {
    e.preventDefault();
    if (!newStoreForm.business_name.trim()) return;
    setIsSubmittingStore(true);
    const success = await createBusiness(newStoreForm);
    setIsSubmittingStore(false);
    if (success) {
      setShowAddStoreModal(false);
      setNewStoreForm({
        business_name: '',
        business_category: 'stationery',
        phone: business?.phone || '',
        state: business?.state || 'Maharashtra',
        gstin: '',
        address: ''
      });
    }
  };

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="mobile-menu-btn"
          aria-label="Toggle navigation drawer"
          title="Open menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="header-title" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-forest)', margin: 0, letterSpacing: '-0.01em' }}>
              {getTabTitle()}
            </h1>

            {/* Enterprise Store Switcher Pill & Dropdown (Admin) or Assigned Store Badge (Staff) */}
            {isAdmin ? (
              <div ref={switcherRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowStoreSwitcher(!showStoreSwitcher)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 9px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#0F172A',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease'
                  }}
                  title="Switch active business or outlet"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {business?.business_name || 'My Store'}
                  </span>
                  <span style={{ fontSize: '9.5px', textTransform: 'uppercase', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                    {business?.business_category || 'Stationery'}
                  </span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>

                {/* Store Switcher Dropdown Menu */}
                {showStoreSwitcher && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      boxShadow: '0 12px 28px -4px rgba(0,0,0,0.15)',
                      minWidth: '280px',
                      zIndex: 1000,
                      padding: '8px'
                    }}
                  >
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Enterprise Outlets &amp; Stores
                    </div>
                    {businesses && businesses.length > 0 ? (
                      businesses.map((b) => {
                        const isCurrent = b.id === business?.id;
                        return (
                          <div
                            key={b.id}
                            onClick={() => {
                              switchBusiness(b.id);
                              setShowStoreSwitcher(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              backgroundColor: isCurrent ? '#F1F5F9' : 'transparent',
                              marginBottom: '2px',
                              transition: 'background-color 0.1s ease'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '12.5px', fontWeight: isCurrent ? 700 : 500, color: '#0F172A' }}>
                                {b.business_name}
                              </div>
                              <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                                Sector: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{b.business_category || 'General'}</span>
                              </div>
                            </div>
                            {isCurrent && (
                              <span style={{ fontSize: '10px', fontWeight: 700, color: '#059669', backgroundColor: '#D1FAE5', padding: '1px 6px', borderRadius: '4px' }}>
                                Active
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: '8px', fontSize: '12px', color: '#64748B' }}>
                        {business?.business_name || 'Primary Store'}
                      </div>
                    )}

                    <div style={{ borderTop: '1px solid #E2E8F0', marginTop: '6px', paddingTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowStoreSwitcher(false);
                          setShowAddStoreModal(true);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '7px',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1px dashed #BFDBFE',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        + Add New Store / Outlet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 9px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155'
                }}
                title={`Assigned to: ${business?.business_name || 'Store'}`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {business?.business_name || 'My Store'}
                </span>
                <span style={{ fontSize: '9.5px', textTransform: 'uppercase', backgroundColor: '#F1F5F9', color: '#475569', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                  {business?.business_category || 'Store'}
                </span>
              </div>
            )}
          </div>

          <div className="header-subtitle" style={{ fontSize: '11.5px', color: 'var(--color-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {business?.gstin && (
              <span className="desktop-meta" style={{ backgroundColor: 'var(--color-stone-light)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                GSTIN: {business.gstin}
              </span>
            )}
            <span className="desktop-meta">State: {business?.state || 'Maharashtra'}</span>
            <span className="desktop-meta">•</span>
            <span className="desktop-meta">Logged in: <b>{user?.full_name}</b> ({user?.role === 'admin' ? 'Owner' : user?.role === 'inventory_manager' ? 'Storekeeper' : 'Cashier'})</span>
          </div>
        </div>
      </div>

      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Interactive Date & Live Time Clock Control */}
        <div
          onClick={handleOpenCalendar}
          className="header-datetime-pill"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-ivory)',
            border: '1px solid var(--color-stone)',
            borderRadius: '6px',
            padding: '4px 10px',
            gap: '8px',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          title="Click to open calendar & pick date"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-forest)', flexShrink: 0 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-charcoal)', fontFamily: 'var(--font-heading)', lineHeight: 1.2 }}>
              {formattedDate}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-forest)', fontFamily: 'var(--font-mono)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {formattedTime}
            </div>
          </div>
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              position: 'absolute',
              opacity: 0,
              width: 0,
              height: 0,
              pointerEvents: 'none'
            }}
          />
        </div>

        {isAdmin && onOpenAdminModal && (
          <button
            type="button"
            onClick={onOpenAdminModal}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="btn-label-text">Store & Staff</span>
          </button>
        )}

        {/* Strictly hide New Invoice button for inventory_manager */}
        {canIssueInvoice && activeTab !== 'invoice' && (
          <button onClick={onNewInvoice} className="btn btn-primary btn-sm">
            <span>+</span> <span className="btn-label-text">New Invoice</span>
          </button>
        )}

        {isAdmin && activeTab === 'inventory' && (
          <button onClick={onNewProduct} className="btn btn-primary btn-sm">
            <span>+</span> <span className="btn-label-text">Add Product</span>
          </button>
        )}
      </div>

      {/* Add New Store / Outlet Modal */}
      {showAddStoreModal && (
        <div className="modal-backdrop" onClick={() => setShowAddStoreModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0F172A' }}>
                  Add New Store / Branch Outlet
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748B' }}>
                  Register another commercial trade under your enterprise (e.g. Pharmacy, Garments, Cafe).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStoreModal(false)}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewStore}>
              <div className="modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Store / Business Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Akhtar Pharmacy, Akhtar Garments"
                    value={newStoreForm.business_name}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, business_name: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Trade Sector / Business Category *</label>
                  <select
                    className="form-select"
                    required
                    value={newStoreForm.business_category}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, business_category: e.target.value })}
                  >
                    <option value="stationery">Books &amp; Stationery</option>
                    <option value="pharmacy">Pharmacy &amp; Healthcare</option>
                    <option value="electronics">Mobile &amp; Electronics</option>
                    <option value="electricals">Electricals &amp; Lighting</option>
                    <option value="automobile">Automobile &amp; Spare Parts</option>
                    <option value="garments">Garments &amp; Fashion</option>
                    <option value="cafe">Cafe &amp; Fast Food</option>
                    <option value="general">General Retail &amp; Grocery</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Store Phone *</label>
                    <input
                      type="tel"
                      required
                      className="form-input"
                      placeholder="e.g. 9876543210"
                      value={newStoreForm.phone}
                      onChange={(e) => setNewStoreForm({ ...newStoreForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">State *</label>
                    <select
                      className="form-select"
                      required
                      value={newStoreForm.state}
                      onChange={(e) => setNewStoreForm({ ...newStoreForm, state: e.target.value })}
                    >
                      <optgroup label="States (28)">
                        {STATES_LIST.map((s) => (
                          <option key={s.code} value={s.name}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Union Territories (8)">
                        {UT_LIST.map((u) => (
                          <option key={u.code} value={u.name}>
                            {u.name} ({u.code})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">GSTIN (Optional)</label>
                  <input
                    type="text"
                    maxLength={15}
                    className="form-input"
                    placeholder="15-digit GSTIN"
                    value={newStoreForm.gstin}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, gstin: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Shop Address (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Branch #2, Main Bazaar"
                    value={newStoreForm.address}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  onClick={() => setShowAddStoreModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStore}
                  className="btn btn-primary btn-sm"
                >
                  {isSubmittingStore ? 'Creating...' : 'Create Store & Switch Now →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
