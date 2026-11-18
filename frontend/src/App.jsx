import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { BrandLogo } from './components/BrandLogo';
import { AdminManagementModal } from './components/AdminManagementModal';
import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';
import { InvoiceView } from './views/InvoiceView';
import { InventoryView } from './views/InventoryView';

const MainApplication = () => {
  const { isAuthenticated, isLoading, isAdmin, user } = useAuth();
  const getDefaultTab = () => {
    if (isAdmin) return 'dashboard';
    if (user?.role === 'inventory_manager') return 'inventory';
    return 'invoice';
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [viewInvoiceId, setViewInvoiceId] = useState(null);
  const [openCreateInvoice, setOpenCreateInvoice] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Strict role-based isolation:
  // - Storekeepers (inventory_manager) ONLY have inventory view (NO invoice or dashboard access)
  // - Cashiers (staff) ONLY have invoice view (their sales terminal)
  useEffect(() => {
    if (!isLoading && isAuthenticated && !isAdmin) {
      if (user?.role === 'inventory_manager') {
        if (activeTab !== 'inventory') {
          setActiveTab('inventory');
        }
      } else if (user?.role === 'staff') {
        if (activeTab !== 'invoice') {
          setActiveTab('invoice');
        }
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, user, activeTab]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#0F172A',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          userSelect: 'none'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px',
            animation: 'fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <BrandLogo size={52} textColor="#FFFFFF" subtitle="Cloud Ledger &amp; POS" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255, 255, 255, 0.15)',
                borderTopColor: '#3B82F6',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }}
            />
            <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 500, letterSpacing: '0.01em' }}>
              Preparing your workspace...
            </span>
          </div>
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
      {/* Collapsible Sidebar with strictly 3 primary items & Mobile Drawer support */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setMobileSidebarOpen(false);
        }}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="app-main">
        <Header
          activeTab={activeTab}
          onNewInvoice={handleNewInvoice}
          onNewProduct={handleNewProduct}
          onOpenAdminModal={() => setShowAdminModal(true)}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />

        <AdminManagementModal
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
        />

        <main className="content-viewport">
          <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
            <DashboardView
              onNewInvoice={handleNewInvoice}
              onNewProduct={handleNewProduct}
              onViewInvoice={handleViewInvoiceFromDashboard}
            />
          </div>

          <div style={{ display: activeTab === 'invoice' ? 'block' : 'none' }}>
            <InvoiceView
              viewInvoiceId={viewInvoiceId}
              onClearViewInvoiceId={() => setViewInvoiceId(null)}
              autoOpenCreator={openCreateInvoice}
              onResetAutoOpen={() => setOpenCreateInvoice(false)}
            />
          </div>

          <div style={{ display: activeTab === 'inventory' ? 'block' : 'none' }}>
            <InventoryView />
          </div>
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
