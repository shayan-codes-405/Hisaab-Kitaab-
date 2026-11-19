import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { STATES_LIST, UT_LIST } from '../constants/states';
import { PasswordInput } from './PasswordInput';

export const AdminManagementModal = ({ isOpen, onClose }) => {
  const { business, businesses, refreshBusiness, apiFetch, switchBusiness, deleteBusiness, createBusiness } = useAuth();
  const { showToast } = useToast();

  // Split-Pane Category State ('staff', 'profile', 'gst', 'bank', 'logo')
  const [activeCategory, setActiveCategory] = useState('staff');

  // Enterprise Store Outlet Management State
  const [deleteStoreTarget, setDeleteStoreTarget] = useState(null);
  const [isDeletingStore, setIsDeletingStore] = useState(false);
  const [showAddOutlet, setShowAddOutlet] = useState(false);
  const [isCreatingOutlet, setIsCreatingOutlet] = useState(false);
  const [newOutletForm, setNewOutletForm] = useState({
    business_name: '',
    business_category: 'stationery',
    phone: '',
    state: 'Maharashtra',
    gstin: '',
    address: ''
  });

  // ==========================================
  // STAFF MANAGEMENT STATE (WITH MEMORY CACHE)
  // ==========================================
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('all');

  // New Staff Form State
  const initialStaffForm = {
    full_name: '',
    username: '',
    password: '',
    role: 'staff',
    business_id: business?.id || '',
    phone: '',
    email: '',
    otp: ''
  };
  const [staffForm, setStaffForm] = useState(initialStaffForm);
  const [staffAuthMethod, setStaffAuthMethod] = useState('password');
  const [adminAuthPassword, setAdminAuthPassword] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpInfo, setOtpInfo] = useState(null);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);

  // Direct Staff Password Reset Modal State
  const [resetTargetStaff, setResetTargetStaff] = useState(null);
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Edit Staff Member & Role Assignment State
  const [editTargetStaff, setEditTargetStaff] = useState(null);
  const [editStaffForm, setEditStaffForm] = useState({
    full_name: '',
    role: 'staff',
    business_id: '',
    phone: '',
    email: '',
    otp: ''
  });
  const [editStaffAuthMethod, setEditStaffAuthMethod] = useState('password');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [editOtpInfo, setEditOtpInfo] = useState(null);
  const [isSendingEditOtp, setIsSendingEditOtp] = useState(false);
  const [isSavingEditStaff, setIsSavingEditStaff] = useState(false);

  // ==========================================
  // BUSINESS SETTINGS STATE
  // ==========================================
  const [bizForm, setBizForm] = useState({
    business_name: '',
    business_category: 'stationery',
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
    logo_data: '',
    textbee_device_id: '',
    textbee_api_key: '',
    textbee_demo_mode: true
  });
  const [isSavingBiz, setIsSavingBiz] = useState(false);

  // Sync business form when opened
  useEffect(() => {
    if (business) {
      setBizForm({
        business_name: business.business_name || '',
        business_category: business.business_category || 'stationery',
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
        logo_data: business.logo_data || '',
        textbee_device_id: business.textbee_device_id || '',
        textbee_api_key: business.textbee_api_key_masked || '',
        textbee_demo_mode: business.textbee_demo_mode ?? true
      });
      if (!staffForm.business_id) {
        setStaffForm((prev) => ({ ...prev, business_id: business.id }));
      }
    }
  }, [business, isOpen]);

  // Load staff list with in-memory caching to eliminate the wipe/flicker
  const loadStaff = async (forceSpinner = false) => {
    if (staffList.length === 0 || forceSpinner) {
      setLoadingStaff(true);
    }
    try {
      const url = selectedStoreFilter && selectedStoreFilter !== 'all'
        ? `/api/auth/staff?store_id=${selectedStoreFilter}`
        : '/api/auth/staff';
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setStaffList(data || []);
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeCategory === 'staff') {
      loadStaff();
    }
  }, [isOpen, activeCategory, selectedStoreFilter]);

  if (!isOpen) return null;

  // Step 1: Send OTP to Admin's registered phone
  const handleSendOtp = async () => {
    if (!staffForm.full_name.trim() || !staffForm.username.trim() || !staffForm.password.trim()) {
      showToast('Please fill in employee Name, Username, and Password first.', 'warning');
      return;
    }
    setIsSendingOtp(true);
    try {
      const res = await apiFetch('/api/auth/staff/send-otp', {
        method: 'POST',
        body: JSON.stringify({ staff_username: staffForm.username.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to send OTP.');
      }
      setOtpInfo(data);
      showToast(data.message, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 2: Authorize & Create Staff (via Admin Password or SMS OTP)
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (staffAuthMethod === 'password') {
      if (!adminAuthPassword.trim()) {
        showToast('Please enter your Admin account password to authorize.', 'warning');
        return;
      }
    } else {
      if (!otpInfo) {
        showToast('Please click "Send SMS OTP Code" first.', 'warning');
        return;
      }
      if (!staffForm.otp.trim()) {
        showToast('Please enter the 6-digit OTP sent to your phone.', 'warning');
        return;
      }
    }

    setIsSubmittingStaff(true);
    try {
      const payload = {
        full_name: staffForm.full_name.trim(),
        username: staffForm.username.trim(),
        password: staffForm.password,
        role: staffForm.role,
        business_id: staffForm.business_id || business?.id,
        phone: staffForm.phone?.trim() || '',
        email: staffForm.email?.trim() || '',
        otp: staffAuthMethod === 'otp' ? staffForm.otp.trim() : '',
        admin_password: staffAuthMethod === 'password' ? adminAuthPassword.trim() : ''
      };

      const res = await apiFetch('/api/auth/staff/create', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to create staff member.');
      }
      showToast(data.message || 'Staff member authorized and created!', 'success');
      setStaffForm(initialStaffForm);
      setOtpInfo(null);
      setAdminAuthPassword('');
      setShowAddForm(false);
      loadStaff(true);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  // Admin Direct Reset Staff Password
  const handleResetStaffPassword = async (e) => {
    e.preventDefault();
    if (!resetTargetStaff) return;
    if (!newStaffPassword || newStaffPassword.length < 6) {
      showToast('New password must be at least 6 characters long.', 'warning');
      return;
    }

    setIsResettingPassword(true);
    try {
      const res = await apiFetch(`/api/auth/staff/${resetTargetStaff.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ new_password: newStaffPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to reset staff password.');
      }
      showToast(data.message, 'success');
      setResetTargetStaff(null);
      setNewStaffPassword('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Edit Staff Profile & Role Assignment Handlers
  const handleOpenEditStaff = (staffMember) => {
    setEditTargetStaff(staffMember);
    setEditStaffForm({
      full_name: staffMember.full_name || '',
      role: staffMember.role || 'staff',
      business_id: staffMember.business_id || business?.id || '',
      phone: staffMember.phone || '',
      email: staffMember.email || '',
      otp: ''
    });
    setEditStaffAuthMethod('password');
    setEditAdminPassword('');
    setEditOtpInfo(null);
  };

  const handleSendEditOtp = async () => {
    setIsSendingEditOtp(true);
    try {
      const res = await apiFetch('/api/auth/staff/send-otp', {
        method: 'POST',
        body: JSON.stringify({ staff_username: editTargetStaff?.username })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send OTP.');
      setEditOtpInfo(data);
      showToast(data.message, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSendingEditOtp(false);
    }
  };

  const handleSaveEditStaff = async (e) => {
    e.preventDefault();
    if (!editTargetStaff) return;

    if (editStaffAuthMethod === 'password') {
      if (!editAdminPassword.trim()) {
        showToast('Please enter your Admin account password to authorize role update.', 'warning');
        return;
      }
    } else {
      if (!editOtpInfo) {
        showToast('Please click "Send SMS OTP Code" first.', 'warning');
        return;
      }
      if (!editStaffForm.otp?.trim()) {
        showToast('Please enter the 6-digit OTP code sent to your phone.', 'warning');
        return;
      }
    }

    setIsSavingEditStaff(true);
    try {
      const payload = {
        full_name: editStaffForm.full_name.trim(),
        role: editStaffForm.role,
        business_id: editStaffForm.business_id,
        phone: editStaffForm.phone?.trim() || '',
        email: editStaffForm.email?.trim() || '',
        admin_password: editStaffAuthMethod === 'password' ? editAdminPassword.trim() : '',
        otp: editStaffAuthMethod === 'otp' ? editStaffForm.otp?.trim() : ''
      };

      const res = await apiFetch(`/api/auth/staff/${editTargetStaff.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update staff role.');
      }
      showToast(data.message || 'Staff role and details updated successfully!', 'success');
      setEditTargetStaff(null);
      setEditAdminPassword('');
      setEditOtpInfo(null);
      loadStaff(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSavingEditStaff(false);
    }
  };

  // Toggle Staff Active/Deactivated
  const handleToggleStatus = async (staffId, currentStatus, name) => {
    try {
      const res = await apiFetch(`/api/auth/staff/${staffId}/toggle-status`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update staff status.');
      }
      showToast(data.message, 'info');
      loadStaff(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Save Business Settings
  const handleSaveBizSettings = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsSavingBiz(true);
    try {
      const payload = { ...bizForm };
      if (payload.textbee_api_key && payload.textbee_api_key.startsWith('•')) {
        delete payload.textbee_api_key;
      }
      const res = await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update business settings.');
      }
      showToast('Settings updated successfully!', 'success');
      await refreshBusiness();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSavingBiz(false);
    }
  };

  // Enterprise Store Outlet Handlers
  const handleDeleteStore = async (store) => {
    if (!store?.id) return;
    setIsDeletingStore(true);
    const success = await deleteBusiness(store.id);
    setIsDeletingStore(false);
    if (success) {
      setDeleteStoreTarget(null);
    }
  };

  const handleCreateOutlet = async (e) => {
    e.preventDefault();
    if (!newOutletForm.business_name.trim()) return;
    setIsCreatingOutlet(true);
    const success = await createBusiness(newOutletForm);
    setIsCreatingOutlet(false);
    if (success) {
      setShowAddOutlet(false);
      setNewOutletForm({
        business_name: '',
        business_category: 'stationery',
        phone: business?.phone || '',
        state: business?.state || 'Maharashtra',
        gstin: '',
        address: ''
      });
    }
  };

  // Handle local store logo file upload
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image size must be less than 2MB.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setBizForm((prev) => ({ ...prev, logo_data: reader.result }));
      showToast('Shop logo selected. Click "Save Settings" below to apply.', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setBizForm((prev) => ({ ...prev, logo_data: '' }));
    showToast('Shop logo removed.', 'info');
  };

  const SETTINGS_CATEGORIES = [
    {
      id: 'staff',
      name: 'Staff & Team',
      desc: 'Roles & Cashiers',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      )
    },
    {
      id: 'profile',
      name: 'Store Identity',
      desc: 'Trade & Contact',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      )
    },
    {
      id: 'gst',
      name: 'GST & Invoicing',
      desc: 'Tax Slabs & Prefix',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      )
    },
    {
      id: 'bank',
      name: 'Banking & UPI',
      desc: 'Accounts & QR Code',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      )
    },
    {
      id: 'logo',
      name: 'Receipt Logo',
      desc: 'Invoice Print Logo',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      )
    }
  ];

  return (
    <div className="modal-backdrop" style={{ zIndex: 1200, backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
      {/* Modern Split-Pane Settings Modal */}
      <div
        className="modal-sheet modal-sheet-lg"
        style={{
          maxWidth: '1020px',
          width: '95%',
          maxHeight: '88vh',
          height: 'auto',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden'
        }}
      >
        {/* Modal Top Header */}
        <div
          style={{
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              Settings &amp; Administration
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
              HisabKitab Platform Console • {business?.business_name || 'My Store'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '20px',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '4px 8px',
              borderRadius: '6px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Master-Detail Split Pane Body */}
        <div style={{ display: 'flex', flex: 1, minHeight: '380px', maxHeight: 'calc(88vh - 120px)', overflow: 'hidden' }}>
          {/* Left Category Navigation Rail */}
          <div
            style={{
              width: '185px',
              backgroundColor: '#F8FAFC',
              borderRight: '1px solid #E2E8F0',
              padding: '12px 6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              overflowY: 'auto',
              flexShrink: 0
            }}
          >
            {SETTINGS_CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
                    color: isSelected ? '#2563EB' : '#475569',
                    boxShadow: isSelected ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                    fontWeight: isSelected ? 700 : 500,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ color: isSelected ? '#2563EB' : '#64748B' }}>
                    {cat.icon}
                  </span>
                  <div>
                    <div style={{ fontSize: '12.5px', lineHeight: 1.2 }}>{cat.name}</div>
                    <div style={{ fontSize: '10px', color: isSelected ? '#3B82F6' : '#94A3B8' }}>{cat.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Form Content Pane */}
          <div style={{ flex: 1, minWidth: 0, padding: '16px 20px', overflowY: 'auto', overflowX: 'hidden', backgroundColor: '#FFFFFF' }}>
            {/* ================================================================ */}
            {/* 1. STAFF & TEAM SECTION */}
            {/* ================================================================ */}
            {activeCategory === 'staff' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                      Authorized Store Staff
                    </h4>
                    <p style={{ margin: 0, fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                      Staff members are authorized via SMS code sent to your registered phone.
                    </p>
                  </div>

                  {!showAddForm && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(true);
                        setStaffForm(initialStaffForm);
                        setOtpInfo(null);
                      }}
                      className="btn btn-primary btn-sm"
                    >
                      <span>+</span> Add Staff Member
                    </button>
                  )}
                </div>

                {/* 2-Step Staff Registration Form */}
                {showAddForm && (
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: '10px',
                      padding: '16px',
                      marginBottom: '20px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        2-Step Employee Onboarding
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ✕ Cancel
                      </button>
                    </div>

                    <form onSubmit={handleCreateStaff}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: '10px' }}>
                        <div className="form-group">
                          <label className="form-label">Full Name *</label>
                          <input
                            type="text"
                            required
                            className="form-input"
                            placeholder="e.g. Rahul Sharma"
                            value={staffForm.full_name}
                            onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Role *</label>
                          <select
                            className="form-select"
                            value={staffForm.role}
                            onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                          >
                            <option value="staff">Billing Cashier (Invoicing)</option>
                            <option value="inventory_manager">Storekeeper (Inventory)</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Assign to Store *</label>
                          <select
                            className="form-select"
                            required
                            value={staffForm.business_id || business?.id || ''}
                            onChange={(e) => setStaffForm({ ...staffForm, business_id: e.target.value })}
                          >
                            {businesses && businesses.length > 0 ? (
                              businesses.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.business_name} ({b.business_category || 'General'})
                                </option>
                              ))
                            ) : (
                              <option value={business?.id || ''}>
                                {business?.business_name || 'Primary Store'}
                              </option>
                            )}
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="form-group">
                          <label className="form-label">Username *</label>
                          <input
                            type="text"
                            required
                            className="form-input"
                            placeholder="e.g. rahul_billing"
                            value={staffForm.username}
                            onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value.toLowerCase().trim() })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Temporary Password *</label>
                          <PasswordInput
                            required
                            minLength={6}
                            placeholder="Min 6 characters"
                            value={staffForm.password}
                            onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="form-group">
                          <label className="form-label">Employee Phone (Optional)</label>
                          <input
                            type="tel"
                            className="form-input"
                            placeholder="e.g. 9876543210"
                            value={staffForm.phone}
                            onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Employee Email (Optional)</label>
                          <input
                            type="email"
                            className="form-input"
                            placeholder="staff@store.com"
                            value={staffForm.email}
                            onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Admin Authorization (Password or SMS OTP) */}
                      <div
                        style={{
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          marginTop: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                              Admin Authorization Required
                            </div>
                            <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0' }}>
                              Approve this staff account using your Admin password or SMS OTP code.
                            </p>
                          </div>

                          <div style={{ display: 'inline-flex', backgroundColor: '#E2E8F0', padding: '2px', borderRadius: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setStaffAuthMethod('password')}
                              style={{
                                border: 'none',
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '5px',
                                cursor: 'pointer',
                                backgroundColor: staffAuthMethod === 'password' ? '#FFFFFF' : 'transparent',
                                color: staffAuthMethod === 'password' ? '#0F172A' : '#64748B',
                                boxShadow: staffAuthMethod === 'password' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              Admin Password
                            </button>
                            <button
                              type="button"
                              onClick={() => setStaffAuthMethod('otp')}
                              style={{
                                border: 'none',
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '5px',
                                cursor: 'pointer',
                                backgroundColor: staffAuthMethod === 'otp' ? '#FFFFFF' : 'transparent',
                                color: staffAuthMethod === 'otp' ? '#0F172A' : '#64748B',
                                boxShadow: staffAuthMethod === 'otp' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              SMS OTP Code
                            </button>
                          </div>
                        </div>

                        {staffAuthMethod === 'password' ? (
                          <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '7px', border: '1px solid #E2E8F0' }}>
                            <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '4px' }}>
                              Admin Account Password *
                            </label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <div style={{ flex: 1 }}>
                                <PasswordInput
                                  required
                                  placeholder="Enter your Admin account password to authorize"
                                  value={adminAuthPassword}
                                  onChange={(e) => setAdminAuthPassword(e.target.value)}
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={isSubmittingStaff}
                                className="btn btn-primary btn-sm"
                                style={{ whiteSpace: 'nowrap', padding: '7px 16px' }}
                              >
                                {isSubmittingStaff ? 'Authorizing...' : 'Authorize & Create Staff'}
                              </button>
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '6px' }}>
                              Direct authorization with zero SMS latency. Approves and creates staff account immediately.
                            </div>
                          </div>
                        ) : (
                          <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '7px', border: '1px solid #E2E8F0' }}>
                            <p style={{ fontSize: '11px', color: '#334155', margin: '0 0 8px 0' }}>
                              A 6-digit confirmation code will be sent to the Admin mobile ({business?.phone || 'Configured Phone'}) via TextBee.
                            </p>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {!otpInfo ? (
                                <button
                                  type="button"
                                  disabled={isSendingOtp}
                                  onClick={handleSendOtp}
                                  className="btn btn-secondary btn-sm"
                                >
                                  {isSendingOtp ? 'Sending SMS...' : 'Send SMS OTP Code'}
                                </button>
                              ) : (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                                  <div style={{ flex: 1 }}>
                                    <input
                                      type="text"
                                      required
                                      maxLength={6}
                                      className="form-input"
                                      placeholder="Enter 6-digit OTP code"
                                      value={staffForm.otp}
                                      onChange={(e) => setStaffForm({ ...staffForm, otp: e.target.value })}
                                      style={{ letterSpacing: '0.25em', fontWeight: 700, textAlign: 'center', fontSize: '14px' }}
                                    />
                                  </div>
                                  <button
                                    type="submit"
                                    disabled={isSubmittingStaff}
                                    className="btn btn-primary btn-sm"
                                  >
                                    {isSubmittingStaff ? 'Verifying...' : 'Authorize & Create'}
                                  </button>
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px' }}>
                              {otpInfo && (
                                <button
                                  type="button"
                                  disabled={isSendingOtp}
                                  onClick={handleSendOtp}
                                  style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                                >
                                  Resend SMS OTP
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setStaffAuthMethod('password')}
                                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 0, textDecoration: 'underline', marginLeft: 'auto' }}
                              >
                                SMS not arriving? Authorize with Admin Password instead
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </form>
                  </div>
                )}

                {/* Direct Staff Password Reset Modal */}
                {resetTargetStaff && (
                  <div
                    style={{
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #FCD34D',
                      borderRadius: '8px',
                      padding: '14px',
                      marginBottom: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
                        Reset Password for @{resetTargetStaff.username} ({resetTargetStaff.full_name})
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setResetTargetStaff(null);
                          setNewStaffPassword('');
                        }}
                        style={{ background: 'none', border: 'none', color: '#92400E', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleResetStaffPassword} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <PasswordInput
                          required
                          minLength={6}
                          placeholder="Enter new 6+ char password"
                          value={newStaffPassword}
                          onChange={(e) => setNewStaffPassword(e.target.value)}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isResettingPassword}
                        className="btn btn-primary btn-sm"
                      >
                        {isResettingPassword ? 'Updating...' : 'Update Password'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Filter Bar & Roster Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                    Staff Roster ({staffList.length})
                  </div>
                  {businesses && businesses.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B' }}>Outlet:</label>
                      <select
                        className="form-select"
                        style={{ padding: '3px 8px', fontSize: '11.5px', width: 'auto' }}
                        value={selectedStoreFilter}
                        onChange={(e) => setSelectedStoreFilter(e.target.value)}
                      >
                        <option value="all">All Outlets</option>
                        {businesses.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.business_name} ({b.business_category || 'General'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Staff Roster Table (Instant in-memory render) */}
                {loadingStaff && staffList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#64748B', fontSize: '12.5px' }}>
                    Loading staff roster...
                  </div>
                ) : staffList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#F8FAFC', borderRadius: '8px', color: '#64748B', fontSize: '12.5px' }}>
                    No staff members registered. Click <b>"+ Add Staff Member"</b> to grant cashier access.
                  </div>
                ) : (
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', width: '100%' }}>
                    <table className="table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                      <thead style={{ backgroundColor: '#F8FAFC' }}>
                        <tr>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', color: '#0F172A', fontWeight: 700, whiteSpace: 'nowrap' }}>Employee</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', color: '#0F172A', fontWeight: 700, whiteSpace: 'nowrap' }}>Username</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', color: '#0F172A', fontWeight: 700, whiteSpace: 'nowrap' }}>Role</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', color: '#0F172A', fontWeight: 700, whiteSpace: 'nowrap' }}>Store Outlet</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', color: '#0F172A', fontWeight: 700, whiteSpace: 'nowrap' }}>Status</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', color: '#0F172A', fontWeight: 700, whiteSpace: 'nowrap' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffList.map((st) => {
                          const isActive = st.is_active !== false;
                          const storeName = st.business_name || (businesses?.find((b) => b.id === st.business_id)?.business_name) || business?.business_name || 'Primary Store';
                          const storeCat = st.business_category || (businesses?.find((b) => b.id === st.business_id)?.business_category) || '';
                          return (
                            <tr key={st.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '12px' }}>{st.full_name}</div>
                                {st.phone && <div style={{ fontSize: '10.5px', color: '#64748B' }}>Tel: {st.phone}</div>}
                              </td>
                              <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: '#334155', whiteSpace: 'nowrap' }}>
                                @{st.username}
                              </td>
                              <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                <span
                                  style={{
                                    fontSize: '10.5px',
                                    fontWeight: 600,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-block',
                                    backgroundColor: st.role === 'inventory_manager' ? '#FEF3C7' : '#EFF6FF',
                                    color: st.role === 'inventory_manager' ? '#92400E' : '#1D4ED8'
                                  }}
                                >
                                  {st.role === 'inventory_manager' ? 'Storekeeper' : 'Billing Cashier'}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                <div>
                                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#1E293B' }}>{storeName}</div>
                                  {storeCat && (
                                    <div style={{ fontSize: '9.5px', textTransform: 'capitalize', color: '#2563EB', fontWeight: 600 }}>{storeCat}</div>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-block',
                                    backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2',
                                    color: isActive ? '#15803D' : '#B91C1C'
                                  }}
                                >
                                  {isActive ? 'Active' : 'Deactivated'}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', gap: '5px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditStaff(st)}
                                    className="btn btn-ghost btn-xs"
                                    style={{ fontSize: '10.5px', padding: '3px 7px', color: '#1D4ED8', backgroundColor: '#EFF6FF', whiteSpace: 'nowrap' }}
                                    title="Edit staff role and outlet"
                                  >
                                    Edit Role
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setResetTargetStaff(st);
                                      setNewStaffPassword('');
                                    }}
                                    className="btn btn-ghost btn-xs"
                                    style={{ fontSize: '10.5px', padding: '3px 6px', color: '#B45309', backgroundColor: '#FEF3C7', whiteSpace: 'nowrap' }}
                                    title="Reset staff password"
                                  >
                                    Reset PW
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(st.id, isActive, st.full_name)}
                                    className="btn btn-ghost btn-xs"
                                    style={{
                                      fontSize: '10.5px',
                                      padding: '3px 6px',
                                      color: isActive ? '#DC2626' : '#16A34A',
                                      backgroundColor: isActive ? '#FEE2E2' : '#DCFCE7',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {isActive ? 'Deactivate' : 'Activate'}
                                  </button>
                                </div>
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

            {/* ================================================================ */}
            {/* 2. STORE IDENTITY SECTION */}
            {/* ================================================================ */}
            {activeCategory === 'profile' && (
              <div>
                {/* Enterprise Outlets & Multi-Store Management Card */}
                <div style={{ marginBottom: '20px', padding: '14px 16px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        Enterprise Outlets &amp; Branches ({businesses?.length || 1})
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748B' }}>
                        Switch active counter context or register and manage separate retail branches.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddOutlet(!showAddOutlet)}
                      className="btn btn-secondary btn-xs"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 10px', color: '#1D4ED8', borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }}
                    >
                      {showAddOutlet ? 'Cancel' : '+ Add Branch Outlet'}
                    </button>
                  </div>

                  {/* Inline Add Outlet Form */}
                  {showAddOutlet && (
                    <form onSubmit={handleCreateOutlet} style={{ marginBottom: '12px', padding: '12px 14px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>
                        Register New Commercial Branch Outlet
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px' }}>Store / Trade Name *</label>
                          <input
                            type="text"
                            required
                            className="form-input"
                            style={{ fontSize: '12px', padding: '6px 10px' }}
                            placeholder="e.g. Apex Pharmacy, Metro Electronics, City Supermarket"
                            value={newOutletForm.business_name}
                            onChange={(e) => setNewOutletForm({ ...newOutletForm, business_name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px' }}>Category *</label>
                          <select
                            className="form-select"
                            required
                            style={{ fontSize: '12px', padding: '6px 10px' }}
                            value={newOutletForm.business_category}
                            onChange={(e) => setNewOutletForm({ ...newOutletForm, business_category: e.target.value })}
                          >
                            <option value="stationery">Books &amp; Stationery</option>
                            <option value="pharmacy">Pharmacy &amp; Healthcare</option>
                            <option value="electronics">Electronics &amp; Mobile</option>
                            <option value="electricals">Electricals &amp; Lighting</option>
                            <option value="automobile">Automobile &amp; Hardware</option>
                            <option value="garments">Garments &amp; Apparel</option>
                            <option value="cafe">Cafe &amp; Fast Food</option>
                            <option value="general">General Retail &amp; Grocery</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px' }}>Store Phone *</label>
                          <input
                            type="tel"
                            required
                            className="form-input"
                            style={{ fontSize: '12px', padding: '6px 10px' }}
                            placeholder="e.g. 9876543210"
                            value={newOutletForm.phone}
                            onChange={(e) => setNewOutletForm({ ...newOutletForm, phone: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px' }}>State *</label>
                          <select
                            className="form-select"
                            required
                            style={{ fontSize: '12px', padding: '6px 10px' }}
                            value={newOutletForm.state}
                            onChange={(e) => setNewOutletForm({ ...newOutletForm, state: e.target.value })}
                          >
                            <optgroup label="States (28)">
                              {STATES_LIST.map((s) => (
                                <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
                              ))}
                            </optgroup>
                            <optgroup label="Union Territories (8)">
                              {UT_LIST.map((u) => (
                                <option key={u.code} value={u.name}>{u.name} ({u.code})</option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setShowAddOutlet(false)}
                          className="btn btn-secondary btn-xs"
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isCreatingOutlet}
                          className="btn btn-primary btn-xs"
                          style={{ fontSize: '11px', padding: '4px 12px' }}
                        >
                          {isCreatingOutlet ? 'Creating...' : 'Create & Switch →'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Outlets Listing */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {businesses && businesses.length > 0 ? (
                      businesses.map((b) => {
                        const isCurrent = b.id === business?.id;
                        const canDelete = businesses.length > 1;
                        return (
                          <div
                            key={b.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              backgroundColor: isCurrent ? '#FFFFFF' : '#F1F5F9',
                              border: isCurrent ? '1px solid #10B981' : '1px solid #E2E8F0',
                              borderRadius: '7px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isCurrent ? '#10B981' : '#94A3B8', flexShrink: 0 }} />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: '12.5px', fontWeight: isCurrent ? 700 : 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.business_name}</span>
                                  {isCurrent && (
                                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#059669', backgroundColor: '#D1FAE5', padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase' }}>
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                                  Sector: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{b.business_category || 'General'}</span> • State: {b.state || 'India'}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                              {!isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => switchBusiness(b.id)}
                                  className="btn btn-ghost btn-xs"
                                  style={{ fontSize: '10.5px', padding: '3px 8px', color: '#2563EB', backgroundColor: '#EFF6FF' }}
                                  title="Switch to this store"
                                >
                                  Switch To
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteStoreTarget(b)}
                                  className="btn btn-ghost btn-xs"
                                  style={{ fontSize: '10.5px', padding: '3px 8px', color: '#DC2626', backgroundColor: '#FEE2E2' }}
                                  title={`Delete outlet "${b.business_name}"`}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ fontSize: '12px', color: '#64748B' }}>
                        {business?.business_name || 'Primary Store'}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                    Active Outlet Profile: {business?.business_name || 'My Store'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                    Primary details for this store outlet. Appears on bills and executive reports.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Shop / Business Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={bizForm.business_name}
                      onChange={(e) => setBizForm({ ...bizForm, business_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Primary Trade Category *</label>
                    <select
                      className="form-select"
                      required
                      value={bizForm.business_category || 'stationery'}
                      onChange={(e) => setBizForm({ ...bizForm, business_category: e.target.value })}
                    >
                      <option value="stationery">Books &amp; Stationery</option>
                      <option value="pharmacy">Pharmacy &amp; Healthcare</option>
                      <option value="electronics">Electronics &amp; Appliances</option>
                      <option value="electrical">Electricals &amp; Lighting</option>
                      <option value="automobile">Automobile &amp; Hardware</option>
                      <option value="garments">Garments &amp; Apparel</option>
                      <option value="cafe">Cafe &amp; Fast Food</option>
                      <option value="general">General Retail &amp; Trade</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Business Phone *</label>
                    <input
                      type="tel"
                      required
                      className="form-input"
                      value={bizForm.phone}
                      onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Business Email (Optional)</label>
                    <input
                      type="email"
                      className="form-input"
                      value={bizForm.email}
                      onChange={(e) => setBizForm({ ...bizForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Shop / Commercial Address</label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    placeholder="Shop #, Street, Commercial Complex"
                    value={bizForm.address}
                    onChange={(e) => setBizForm({ ...bizForm, address: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* 3. GST & INVOICING SECTION */}
            {/* ================================================================ */}
            {activeCategory === 'gst' && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                    GST Tax &amp; Invoicing Prefix
                  </h4>
                  <p style={{ margin: 0, fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                    Configure Indian GST parameters and numbering for customer bills.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">GSTIN (15 Digits)</label>
                    <input
                      type="text"
                      maxLength={15}
                      className="form-input"
                      placeholder="e.g. 27AAAAA0000A1Z5"
                      value={bizForm.gstin}
                      onChange={(e) => setBizForm({ ...bizForm, gstin: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Place of Supply (State) *</label>
                    <select
                      className="form-select"
                      required
                      value={bizForm.state}
                      onChange={(e) => setBizForm({ ...bizForm, state: e.target.value })}
                    >
                      <optgroup label="States (28)">
                        {STATES_LIST.map((s) => (
                          <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
                        ))}
                      </optgroup>
                      <optgroup label="Union Territories (8)">
                        {UT_LIST.map((u) => (
                          <option key={u.code} value={u.name}>{u.name} ({u.code})</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Invoice Prefix</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="INV"
                      value={bizForm.invoice_prefix}
                      onChange={(e) => setBizForm({ ...bizForm, invoice_prefix: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Default Terms &amp; Conditions (Footer)</label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    placeholder="1. Goods once sold will not be returned.&#10;2. Payment due within 15 days."
                    value={bizForm.terms_conditions}
                    onChange={(e) => setBizForm({ ...bizForm, terms_conditions: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* 4. BANKING & UPI SECTION */}
            {/* ================================================================ */}
            {activeCategory === 'bank' && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                    Bank Account &amp; UPI QR Code
                  </h4>
                  <p style={{ margin: 0, fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                    Payment details printed on customer invoices for direct bank transfer and UPI scanning.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Bank Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. State Bank of India"
                      value={bizForm.bank_name}
                      onChange={(e) => setBizForm({ ...bizForm, bank_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bank Account Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 123456789012"
                      value={bizForm.bank_account_no}
                      onChange={(e) => setBizForm({ ...bizForm, bank_account_no: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Bank IFSC Code</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. SBIN0001234"
                      value={bizForm.bank_ifsc}
                      onChange={(e) => setBizForm({ ...bizForm, bank_ifsc: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">UPI ID / VPA (For Dynamic QR)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. storename@upi"
                      value={bizForm.upi_id}
                      onChange={(e) => setBizForm({ ...bizForm, upi_id: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* 5. RECEIPT LOGO BRANDING SECTION */}
            {/* ================================================================ */}
            {activeCategory === 'logo' && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                    Receipt &amp; Invoice Logo
                  </h4>
                  <p style={{ margin: 0, fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                    Upload your store's custom logo to be printed on customer invoices and receipts.
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    padding: '18px',
                    border: '1.5px dashed #CBD5E1',
                    borderRadius: '10px',
                    backgroundColor: '#F8FAFC'
                  }}
                >
                  {/* Current or Preview Image */}
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}
                  >
                    {bizForm.logo_data ? (
                      <img
                        src={bizForm.logo_data}
                        alt="Store Logo"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'center', padding: '4px' }}>
                        No Logo Uploaded
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                      Upload Shop Brand Logo
                    </div>
                    <p style={{ fontSize: '11.5px', color: '#64748B', margin: '0 0 10px 0' }}>
                      PNG, JPG, or SVG up to 2MB. Transparent background recommended for sharp invoice printing.
                    </p>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                        Choose File
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleLogoUpload}
                        />
                      </label>
                      {bizForm.logo_data && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#DC2626' }}
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Sticky Bottom Action Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0'
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            Active Store: <b style={{ color: '#0F172A' }}>{business?.business_name || 'My Store'}</b>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Close
            </button>
            {activeCategory !== 'staff' && (
              <button
                type="button"
                disabled={isSavingBiz}
                onClick={handleSaveBizSettings}
                className="btn btn-primary btn-sm"
                style={{ minWidth: '120px' }}
              >
                {isSavingBiz ? 'Saving...' : 'Save Settings'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Staff Role & Assignment Modal */}
      {editTargetStaff && (
        <div className="modal-backdrop" style={{ zIndex: 1300 }} onClick={() => !isSavingEditStaff && setEditTargetStaff(null)}>
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)' }}
          >
            {/* Dark Slate Modal Header */}
            <div style={{ backgroundColor: '#0F172A', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, backgroundColor: 'rgba(37, 99, 235, 0.25)', color: '#60A5FA', padding: '2px 7px', borderRadius: '4px' }}>
                    Staff Role Reassignment
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>
                  Edit Staff Role &amp; Assignment
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#94A3B8' }}>
                  @{editTargetStaff.username} • {editTargetStaff.full_name}
                </p>
              </div>
              <button
                type="button"
                disabled={isSavingEditStaff}
                onClick={() => setEditTargetStaff(null)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '18px', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', lineHeight: 1 }}
                title="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditStaff}>
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#FFFFFF', maxHeight: 'calc(80vh - 120px)', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11.5px' }}>Full Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      style={{ fontSize: '12.5px', padding: '7px 10px' }}
                      value={editStaffForm.full_name}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, full_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11.5px', fontWeight: 700, color: '#1E40AF' }}>
                      Assigned Role *
                    </label>
                    <select
                      className="form-select"
                      required
                      style={{ fontSize: '12.5px', padding: '7px 10px', borderColor: '#3B82F6', fontWeight: 600 }}
                      value={editStaffForm.role}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, role: e.target.value })}
                    >
                      <option value="staff">Billing Cashier (Invoicing)</option>
                      <option value="inventory_manager">Storekeeper (Stockist)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11.5px' }}>Assigned Store Outlet *</label>
                  <select
                    className="form-select"
                    required
                    style={{ fontSize: '12.5px', padding: '7px 10px' }}
                    value={editStaffForm.business_id || business?.id || ''}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, business_id: e.target.value })}
                  >
                    {businesses && businesses.length > 0 ? (
                      businesses.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.business_name} ({b.business_category || 'General'})
                        </option>
                      ))
                    ) : (
                      <option value={business?.id || ''}>{business?.business_name || 'Primary Store'}</option>
                    )}
                  </select>
                  <span style={{ fontSize: '10.5px', color: '#64748B', marginTop: '3px', display: 'block' }}>
                    Staff permissions and stock operations will be confined to this store.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11.5px' }}>Employee Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      style={{ fontSize: '12.5px', padding: '7px 10px' }}
                      value={editStaffForm.phone}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11.5px' }}>Employee Email</label>
                    <input
                      type="email"
                      className="form-input"
                      style={{ fontSize: '12.5px', padding: '7px 10px' }}
                      value={editStaffForm.email}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, email: e.target.value })}
                    />
                  </div>
                </div>

                {/* Admin Authorization (Password or SMS OTP) */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    marginTop: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                        Admin Authorization Required
                      </div>
                      <p style={{ fontSize: '10.5px', color: '#64748B', margin: '1px 0 0' }}>
                        Confirm permission changes with Admin password or SMS OTP.
                      </p>
                    </div>

                    <div style={{ display: 'inline-flex', backgroundColor: '#E2E8F0', padding: '2px', borderRadius: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setEditStaffAuthMethod('password')}
                        style={{
                          border: 'none',
                          padding: '3px 8px',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          borderRadius: '5px',
                          cursor: 'pointer',
                          backgroundColor: editStaffAuthMethod === 'password' ? '#FFFFFF' : 'transparent',
                          color: editStaffAuthMethod === 'password' ? '#0F172A' : '#64748B',
                          boxShadow: editStaffAuthMethod === 'password' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                        }}
                      >
                        Admin Password
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditStaffAuthMethod('otp')}
                        style={{
                          border: 'none',
                          padding: '3px 8px',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          borderRadius: '5px',
                          cursor: 'pointer',
                          backgroundColor: editStaffAuthMethod === 'otp' ? '#FFFFFF' : 'transparent',
                          color: editStaffAuthMethod === 'otp' ? '#0F172A' : '#64748B',
                          boxShadow: editStaffAuthMethod === 'otp' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                        }}
                      >
                        SMS OTP Code
                      </button>
                    </div>
                  </div>

                  {editStaffAuthMethod === 'password' ? (
                    <div style={{ backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '7px', border: '1px solid #E2E8F0' }}>
                      <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                        Admin Account Password *
                      </label>
                      <PasswordInput
                        required
                        placeholder="Enter your Admin password to authorize role update"
                        value={editAdminPassword}
                        onChange={(e) => setEditAdminPassword(e.target.value)}
                      />
                      <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
                        Zero SMS delay. Confirms role change instantly.
                      </div>
                    </div>
                  ) : (
                    <div style={{ backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '7px', border: '1px solid #E2E8F0' }}>
                      <p style={{ fontSize: '10.5px', color: '#334155', margin: '0 0 8px 0' }}>
                        Confirmation code will be sent to Admin phone ({business?.phone || 'Configured Phone'}).
                      </p>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {!editOtpInfo ? (
                          <button
                            type="button"
                            disabled={isSendingEditOtp}
                            onClick={handleSendEditOtp}
                            className="btn btn-secondary btn-xs"
                            style={{ fontSize: '11.5px', padding: '5px 12px' }}
                          >
                            {isSendingEditOtp ? 'Sending SMS...' : 'Send SMS OTP Code'}
                          </button>
                        ) : (
                          <input
                            type="text"
                            required
                            maxLength={6}
                            className="form-input"
                            placeholder="Enter 6-digit OTP code"
                            value={editStaffForm.otp || ''}
                            onChange={(e) => setEditStaffForm({ ...editStaffForm, otp: e.target.value })}
                            style={{ letterSpacing: '0.25em', fontWeight: 700, textAlign: 'center', fontSize: '13px', padding: '6px' }}
                          />
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '10.5px' }}>
                        {editOtpInfo && (
                          <button
                            type="button"
                            disabled={isSendingEditOtp}
                            onClick={handleSendEditOtp}
                            style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                          >
                            Resend SMS OTP
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditStaffAuthMethod('password')}
                          style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 0, textDecoration: 'underline', marginLeft: 'auto' }}
                        >
                          SMS not arriving? Authorize with Admin Password instead
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: '12px 20px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  disabled={isSavingEditStaff}
                  onClick={() => setEditTargetStaff(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEditStaff}
                  className="btn btn-primary btn-sm"
                >
                  {isSavingEditStaff ? 'Saving Role...' : 'Save Staff Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Store Outlet Confirmation Dialog */}
      {deleteStoreTarget && (
        <div className="modal-backdrop" style={{ zIndex: 1300 }} onClick={() => !isDeletingStore && setDeleteStoreTarget(null)}>
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.35)' }}
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
                  Permanent branch removal
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
    </div>
  );
};
