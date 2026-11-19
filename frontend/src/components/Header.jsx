import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { STATES_LIST, UT_LIST } from '../constants/states';

export const Header = ({ activeTab, onNewInvoice, onNewProduct, onOpenAdminModal, onToggleMobileSidebar }) => {
  const { business, businesses, switchBusiness, createBusiness, deleteBusiness, fetchBusinesses, isAdmin, user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const dateInputRef = useRef(null);

  // Store Switcher & New Store Modal State
  const [showStoreSwitcher, setShowStoreSwitcher] = useState(false);
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [deleteStoreTarget, setDeleteStoreTarget] = useState(null);
  const [isDeletingStore, setIsDeletingStore] = useState(false);
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

  const handleDeleteStore = async (store) => {
    if (!store?.id) return;
    setIsDeletingStore(true);
    const success = await deleteBusiness(store.id);
    setIsDeletingStore(false);
    if (success) {
      setDeleteStoreTarget(null);
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
                      borderRadius: '12px',
                      boxShadow: '0 16px 36px -4px rgba(15, 23, 42, 0.18)',
                      minWidth: '320px',
                      maxWidth: '380px',
                      zIndex: 1000,
                      padding: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px 10px', borderBottom: '1px solid #F1F5F9', marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Enterprise Outlets ({businesses?.length || 1})
                      </div>
                      <span style={{ fontSize: '10px', color: '#94A3B8' }}>
                        Switch or Manage
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '260px', overflowY: 'auto' }}>
                      {businesses && businesses.length > 0 ? (
                        businesses.map((b) => {
                          const isCurrent = b.id === business?.id;
                          const canDelete = businesses.length > 1;
                          return (
                            <div
                              key={b.id}
                              onClick={() => {
                                if (!isCurrent) {
                                  switchBusiness(b.id);
                                  setShowStoreSwitcher(false);
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '9px 10px',
                                borderRadius: '8px',
                                cursor: isCurrent ? 'default' : 'pointer',
                                backgroundColor: isCurrent ? '#F0FDF4' : '#FFFFFF',
                                border: isCurrent ? '1px solid #BBF7D0' : '1px solid #F1F5F9',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                <div
                                  style={{
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '6px',
                                    backgroundColor: isCurrent ? '#DCFCE7' : '#F1F5F9',
                                    color: isCurrent ? '#16A34A' : '#64748B',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                  </svg>
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '12.5px', fontWeight: isCurrent ? 700 : 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {b.business_name}
                                    </span>
                                    {isCurrent && (
                                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#16A34A', backgroundColor: '#DCFCE7', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '10.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                                    <span style={{ textTransform: 'capitalize' }}>{b.business_category || 'General'}</span>
                                    <span>•</span>
                                    <span>{b.state || 'India'}</span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteStoreTarget(b);
                                    }}
                                    title={`Delete outlet "${b.business_name}"`}
                                    style={{
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '5px 7px',
                                      color: '#94A3B8',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#FEE2E2';
                                      e.currentTarget.style.color = '#DC2626';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                      e.currentTarget.style.color = '#94A3B8';
                                    }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                      <line x1="10" y1="11" x2="10" y2="17" />
                                      <line x1="14" y1="11" x2="14" y2="17" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: '8px', fontSize: '12px', color: '#64748B' }}>
                          {business?.business_name || 'Primary Store'}
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid #E2E8F0', marginTop: '8px', paddingTop: '8px' }}>
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
                          padding: '8px 12px',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1px dashed #93C5FD',
                          borderRadius: '7px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add New Store / Branch Outlet
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
        <div className="modal-backdrop" onClick={() => !isSubmittingStore && setShowAddStoreModal(false)}>
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)' }}
          >
            {/* Dark Slate Premium SaaS Modal Header */}
            <div style={{ backgroundColor: '#0F172A', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, backgroundColor: 'rgba(37, 99, 235, 0.25)', color: '#60A5FA', padding: '2px 8px', borderRadius: '4px' }}>
                    Multi-Branch Architecture
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  Add New Store / Branch Outlet
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#94A3B8' }}>
                  Register an additional commercial trade or branch location under your enterprise.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStoreModal(false)}
                disabled={isSubmittingStore}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  lineHeight: 1
                }}
                title="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewStore}>
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#FFFFFF', maxHeight: 'calc(85vh - 140px)', overflowY: 'auto' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    Store / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    style={{ borderRadius: '8px', border: '1px solid #CBD5E1', padding: '9px 12px', fontSize: '13px' }}
                    placeholder="e.g. Apex Pharmacy, Metro Electronics, City Supermarket"
                    value={newStoreForm.business_name}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, business_name: e.target.value })}
                  />
                  <span style={{ fontSize: '11px', color: '#64748B', marginTop: '3px', display: 'block' }}>
                    This trade name will appear on tax receipts, invoices, and executive ledger reports.
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B', marginBottom: '5px' }}>
                    Trade Sector / Business Category *
                  </label>
                  <select
                    className="form-select"
                    required
                    style={{ borderRadius: '8px', border: '1px solid #CBD5E1', padding: '9px 12px', fontSize: '13px' }}
                    value={newStoreForm.business_category}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, business_category: e.target.value })}
                  >
                    <option value="stationery">Books &amp; Stationery</option>
                    <option value="pharmacy">Pharmacy &amp; Healthcare</option>
                    <option value="electronics">Mobile, Computers &amp; Electronics</option>
                    <option value="electricals">Electricals, Hardware &amp; Lighting</option>
                    <option value="automobile">Automobile &amp; Spare Parts</option>
                    <option value="garments">Garments, Apparel &amp; Fashion</option>
                    <option value="cafe">Cafe, Bakery &amp; Fast Food</option>
                    <option value="general">General Retail &amp; Grocery</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B', marginBottom: '5px' }}>
                      Store Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      className="form-input"
                      style={{ borderRadius: '8px', border: '1px solid #CBD5E1', padding: '9px 12px', fontSize: '13px' }}
                      placeholder="e.g. 9876543210"
                      value={newStoreForm.phone}
                      onChange={(e) => setNewStoreForm({ ...newStoreForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B', marginBottom: '5px' }}>
                      State / Jurisdiction *
                    </label>
                    <select
                      className="form-select"
                      required
                      style={{ borderRadius: '8px', border: '1px solid #CBD5E1', padding: '9px 12px', fontSize: '13px' }}
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
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B', marginBottom: '5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>GSTIN</span>
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>Optional</span>
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    className="form-input"
                    style={{ borderRadius: '8px', border: '1px solid #CBD5E1', padding: '9px 12px', fontSize: '13px', fontFamily: 'monospace', textTransform: 'uppercase' }}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    value={newStoreForm.gstin}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, gstin: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B', marginBottom: '5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Shop Address</span>
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>Optional</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ borderRadius: '8px', border: '1px solid #CBD5E1', padding: '9px 12px', fontSize: '13px' }}
                    placeholder="e.g. Shop #12, Commercial Plaza, MG Road"
                    value={newStoreForm.address}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, address: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ padding: '14px 22px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  disabled={isSubmittingStore}
                  onClick={() => setShowAddStoreModal(false)}
                  className="btn btn-secondary btn-sm"
                  style={{ borderRadius: '7px', padding: '8px 16px', fontSize: '12.5px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStore}
                  className="btn btn-primary btn-sm"
                  style={{ borderRadius: '7px', padding: '8px 18px', fontSize: '12.5px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {isSubmittingStore ? 'Creating Outlet...' : 'Create Store & Switch Now →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Store Confirmation Modal */}
      {deleteStoreTarget && (
        <div className="modal-backdrop" onClick={() => !isDeletingStore && setDeleteStoreTarget(null)}>
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.3)' }}
          >
            <div style={{ backgroundColor: '#FEF2F2', padding: '16px 20px', borderBottom: '1px solid #FEE2E2', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#991B1B' }}>
                  Delete Store Outlet
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#B91C1C' }}>
                  Permanent removal of commercial branch
                </p>
              </div>
            </div>

            <div style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                Are you sure you want to delete outlet <b>"{deleteStoreTarget.business_name}"</b>?
              </p>
              <div style={{ marginTop: '12px', padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11.5px', color: '#64748B', lineHeight: 1.4 }}>
                All previous invoices, inventory stock ledger, and assigned staff will be consolidated safely under your primary store so financial history is never lost.
              </div>
            </div>

            <div style={{ padding: '14px 20px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={isDeletingStore}
                onClick={() => setDeleteStoreTarget(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '7px 14px', borderRadius: '7px', fontSize: '12.5px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingStore}
                onClick={() => handleDeleteStore(deleteStoreTarget)}
                style={{
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '7px 16px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: isDeletingStore ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isDeletingStore ? 'Deleting Store...' : 'Confirm Delete Outlet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
