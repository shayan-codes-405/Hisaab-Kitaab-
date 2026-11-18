import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { STATES_LIST, UT_LIST } from '../constants/states';
import { PasswordInput } from './PasswordInput';

export const AdminManagementModal = ({ isOpen, onClose }) => {
  const { business, businesses, refreshBusiness, apiFetch } = useAuth();
  const { showToast } = useToast();

  // Split-Pane Category State ('staff', 'profile', 'gst', 'bank', 'logo')
  const [activeCategory, setActiveCategory] = useState('staff');

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
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpInfo, setOtpInfo] = useState(null);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);

  // Direct Staff Password Reset Modal State
  const [resetTargetStaff, setResetTargetStaff] = useState(null);
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

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

  // Step 2: Authorize & Create Staff
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!otpInfo) {
      showToast('Please click "Send OTP to Admin Phone" first.', 'warning');
      return;
    }
    if (!staffForm.otp.trim()) {
      showToast('Please enter the 6-digit OTP sent to your phone.', 'warning');
      return;
    }

    setIsSubmittingStaff(true);
    try {
      const res = await apiFetch('/api/auth/staff/create', {
        method: 'POST',
        body: JSON.stringify(staffForm)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to create staff member.');
      }
      showToast(data.message, 'success');
      setStaffForm(initialStaffForm);
      setOtpInfo(null);
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
          maxWidth: '960px',
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
              width: '210px',
              backgroundColor: '#F8FAFC',
              borderRight: '1px solid #E2E8F0',
              padding: '12px 8px',
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
          <div style={{ flex: 1, minWidth: 0, padding: '22px 26px', overflowY: 'auto', backgroundColor: '#FFFFFF' }}>
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

                      {/* Step 1 & Step 2 OTP Box */}
                      <div
                        style={{
                          backgroundColor: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          borderRadius: '8px',
                          padding: '12px',
                          marginTop: '10px'
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF', marginBottom: '2px' }}>
                          Admin Authorization Code
                        </div>
                        <p style={{ fontSize: '11px', color: '#3B82F6', margin: 0, marginBottom: '8px' }}>
                          A 6-digit confirmation code will be sent to the Admin mobile ({business?.phone || 'Configured Phone'}) to approve this account.
                        </p>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          {!otpInfo ? (
                            <button
                              type="button"
                              disabled={isSendingOtp}
                              onClick={handleSendOtp}
                              className="btn btn-secondary btn-sm"
                            >
                              {isSendingOtp ? 'Sending SMS...' : 'Send Authorization Code'}
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

                        {otpInfo && otpInfo.demo_otp && (
                          <div style={{ marginTop: '8px', fontSize: '11px', color: '#047857', backgroundColor: '#ECFDF5', padding: '5px 8px', borderRadius: '4px' }}>
                            Demo Code: <code>{otpInfo.demo_otp}</code>
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
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                    <table className="table" style={{ margin: 0, width: '100%', minWidth: '680px', borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: '#F8FAFC' }}>
                        <tr>
                          <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11.5px', color: '#0F172A', fontWeight: 700, whiteSpace: 'nowrap' }}>Employee</th>
                          <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11.5px', color: '#0F172A', fontWeight: 700, whiteSpace: 'nowrap' }}>Username</th>
                          <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11.5px', color: '#0F172A', fontWeight: 700, whiteSpace: 'nowrap' }}>Role</th>
                          <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11.5px', color: '#0F172A', fontWeight: 700, whiteSpace: 'nowrap' }}>Assigned Store</th>
                          <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11.5px', color: '#0F172A', fontWeight: 700, whiteSpace: 'nowrap' }}>Status</th>
                          <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: '11.5px', color: '#0F172A', fontWeight: 700, whiteSpace: 'nowrap', minWidth: '180px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffList.map((st) => {
                          const isActive = st.is_active !== false;
                          const storeName = st.business_name || (businesses?.find((b) => b.id === st.business_id)?.business_name) || business?.business_name || 'Primary Store';
                          const storeCat = st.business_category || (businesses?.find((b) => b.id === st.business_id)?.business_category) || '';
                          return (
                            <tr key={st.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '12.5px' }}>{st.full_name}</div>
                                {st.phone && <div style={{ fontSize: '11px', color: '#64748B' }}>Tel: {st.phone}</div>}
                              </td>
                              <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#334155', whiteSpace: 'nowrap' }}>
                                @{st.username}
                              </td>
                              <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '2px 8px',
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
                              <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#F8FAFC', padding: '2px 7px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#1E293B' }}>{storeName}</span>
                                  {storeCat && (
                                    <span style={{ fontSize: '9px', textTransform: 'capitalize', color: '#2563EB', fontWeight: 700 }}>({storeCat})</span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                                <span
                                  style={{
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
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
                              <td style={{ padding: '9px 12px', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '180px' }}>
                                <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setResetTargetStaff(st);
                                      setNewStaffPassword('');
                                    }}
                                    className="btn btn-ghost btn-sm"
                                    style={{ fontSize: '11px', padding: '3px 8px', color: '#B45309', backgroundColor: '#FEF3C7', whiteSpace: 'nowrap' }}
                                    title="Reset password directly"
                                  >
                                    Reset Password
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(st.id, isActive, st.full_name)}
                                    className="btn btn-ghost btn-sm"
                                    style={{
                                      fontSize: '11px',
                                      padding: '3px 8px',
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
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                    Store Profile &amp; Trade Category
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
    </div>
  );
};
