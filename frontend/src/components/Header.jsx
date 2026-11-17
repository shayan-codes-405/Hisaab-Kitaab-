import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export const Header = ({ activeTab, onNewInvoice, onNewProduct, onOpenAdminModal, onToggleMobileSidebar }) => {
  const { business, isAdmin, user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const dateInputRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getTabTitle = () => {
    if (activeTab === 'invoice') {
      return isAdmin ? 'GST Invoice & Billing Ledger' : 'My Sales Terminal & History';
    }
    if (activeTab === 'inventory') {
      return user?.role === 'inventory_manager'
        ? 'Inventory & Warehouse Stock Management'
        : 'Product Inventory & Stock Tracking';
    }
    if (activeTab === 'dashboard') {
      return 'Business Overview & Ledger Analytics';
    }
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
          <h1 className="header-title" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-forest)', margin: 0, letterSpacing: '-0.01em' }}>
            {getTabTitle()}
          </h1>
          <div className="header-subtitle" style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>
              {business?.business_name || 'My Business'}
            </span>
            {business?.gstin && (
              <span className="desktop-meta" style={{ backgroundColor: 'var(--color-stone-light)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                GSTIN: {business.gstin}
              </span>
            )}
            <span className="desktop-meta">•</span>
            <span className="desktop-meta">State: {business?.state || 'Maharashtra'}</span>
          </div>
        </div>
      </div>

      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Working Interactive Date & Live Time Clock Control */}
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
          <span style={{ fontSize: '15px' }}>📅</span>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-charcoal)', fontFamily: 'var(--font-heading)', lineHeight: 1.2 }}>
              {formattedDate}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-forest)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              🕒 {formattedTime}
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
            <span>⚙️</span> <span className="btn-label-text">Store & Staff</span>
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
    </header>
  );
};
