import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const Header = ({ activeTab, onNewInvoice, onNewProduct }) => {
  const { business } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Business Overview & Ledger Analytics';
      case 'invoice':
        return 'GST Invoice & Billing Ledger';
      case 'inventory':
        return 'Product Inventory & Stock Tracking';
      default:
        return 'HisabKitab';
    }
  };

  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(selectedDate));

  return (
    <header
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--color-stone)',
        padding: '12px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        position: 'sticky',
        top: 0,
        zIndex: 90
      }}
    >
      <div>
        <h1 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-forest)', margin: 0, letterSpacing: '-0.01em' }}>
          {getTabTitle()}
        </h1>
        <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>
            {business?.business_name || 'My Business'}
          </span>
          {business?.gstin && (
            <span style={{ backgroundColor: 'var(--color-stone-light)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              GSTIN: {business.gstin}
            </span>
          )}
          <span>•</span>
          <span>State: {business?.state || 'Maharashtra'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Working Interactive Date / Calendar Control */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-ivory)',
            border: '1px solid var(--color-stone)',
            borderRadius: '6px',
            padding: '4px 10px',
            gap: '8px',
            cursor: 'pointer'
          }}
          title="Click to view or pick date"
        >
          <span style={{ fontSize: '14px' }}>📅</span>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-charcoal)', fontFamily: 'var(--font-heading)' }}>
            {formattedDate}
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              position: 'absolute',
              opacity: 0,
              inset: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer'
            }}
          />
        </div>

        {activeTab !== 'invoice' && (
          <button onClick={onNewInvoice} className="btn btn-primary btn-sm">
            <span>+</span> New Invoice
          </button>
        )}

        {activeTab === 'inventory' && (
          <button onClick={onNewProduct} className="btn btn-primary btn-sm">
            <span>+</span> Add Product
          </button>
        )}
      </div>
    </header>
  );
};
