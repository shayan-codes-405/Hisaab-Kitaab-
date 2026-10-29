import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';
import { InvoiceView } from './views/InvoiceView';
import { InventoryView } from './views/InventoryView';

const MainApplication = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'invoice', 'inventory'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewInvoiceId, setViewInvoiceId] = useState(null);
  const [openCreateInvoice, setOpenCreateInvoice] = useState(false);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--color-ivory)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-forest)',
          fontFamily: 'var(--font-heading)',
          fontSize: '16px',
          fontWeight: 700
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-forest)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '20px',
              marginBottom: '12px'
            }}
          >
            HK
          </div>
          <div>Connecting to HisabKitab Ledger...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  const handleNewInvoice = () => {
    setActiveTab('invoice');
    setOpenCreateInvoice(true);
  };

  const handleNewProduct = () => {
    setActiveTab('inventory');
  };

  const handleViewInvoiceFromDashboard = (invId) => {
    setViewInvoiceId(invId);
    setActiveTab('invoice');
  };

  return (
    <div className="app-layout">
      {/* Collapsible Sidebar with strictly 3 primary items */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="app-main">
        <Header
          activeTab={activeTab}
          onNewInvoice={handleNewInvoice}
          onNewProduct={handleNewProduct}
        />

        <main className="content-viewport">
          {activeTab === 'dashboard' && (
            <DashboardView
              onNewInvoice={handleNewInvoice}
              onNewProduct={handleNewProduct}
              onViewInvoice={handleViewInvoiceFromDashboard}
            />
          )}

          {activeTab === 'invoice' && (
            <InvoiceView
              viewInvoiceId={viewInvoiceId}
              onClearViewInvoiceId={() => setViewInvoiceId(null)}
              autoOpenCreator={openCreateInvoice}
              onResetAutoOpen={() => setOpenCreateInvoice(false)}
            />
          )}

          {activeTab === 'inventory' && <InventoryView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApplication />
      </AuthProvider>
    </ToastProvider>
  );
}
