import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { STATES_LIST, UT_LIST } from '../constants/states';
import { PasswordInput } from './PasswordInput';

export const AdminManagementModal = ({ isOpen, onClose }) => {
  const { business, refreshBusiness, apiFetch } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('staff'); // 'staff' or 'business'

  // ==========================================
  // STAFF MANAGEMENT STATE
  // ==========================================
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Staff Form State
  const initialStaffForm = {
    full_name: '',
    username: '',
    password: '',
    role: 'staff',
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
        textbee_device_id: business.textbee_device_id || '',
        textbee_api_key: business.textbee_api_key_masked || '',
        textbee_demo_mode: business.textbee_demo_mode ?? true
      });
    }
  }, [business, isOpen]);

  // Load staff list
  const loadStaff = async () => {
    setLoadingStaff(true);
    try {
      const res = await apiFetch('/api/auth/staff');
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
    if (isOpen && activeTab === 'staff') {
      loadStaff();
    }
  }, [isOpen, activeTab]);

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
      loadStaff();
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
      loadStaff();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delete Staff Member
  const handleDeleteStaff = async (staffId, name) => {
    if (!window.confirm(`Are you sure you want to permanently remove "${name}" from your staff roster?`)) {
      return;
    }
    try {
      const res = await apiFetch(`/api/auth/staff/${staffId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to delete staff member.');
      }
      showToast(data.message, 'success');
      loadStaff();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Save Business Settings
  const handleSaveBizSettings = async (e) => {
    e.preventDefault();
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
      showToast('Business profile updated successfully!', 'success');
      await refreshBusiness();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSavingBiz(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1200, backgroundColor: 'rgba(20, 32, 26, 0.65)' }}>
      {/* Main Opaque Sheet */}
      <div
        className="modal-sheet modal-sheet-lg"
        style={{
          maxWidth: '780px',
          width: '95%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--color-stone)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            backgroundColor: 'var(--color-forest)',
            color: '#ffffff',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#ffffff' }}>
              ⚙️ Business & Staff Security Center
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginTop: '2px' }}>
              {business?.business_name || 'My Business'} • Owner Controls
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
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

        {/* Tab Navigation Pill Bar (TextBee Tab Removed as Requested) */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-stone-light)',
            backgroundColor: '#F8F6F0',
            padding: '10px 20px 0 20px',
            gap: '10px'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            style={{
              padding: '9px 18px',
              border: 'none',
              borderBottom: activeTab === 'staff' ? '3px solid var(--color-copper)' : '3px solid transparent',
              background: activeTab === 'staff' ? '#ffffff' : 'transparent',
              color: activeTab === 'staff' ? 'var(--color-forest)' : '#64748B',
              fontWeight: activeTab === 'staff' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              borderRadius: activeTab === 'staff' ? '6px 6px 0 0' : '0',
              boxShadow: activeTab === 'staff' ? '0 -2px 6px rgba(0,0,0,0.03)' : 'none'
            }}
          >
            👥 Staff & Roles (2-Step OTP)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('business')}
            style={{
              padding: '9px 18px',
              border: 'none',
              borderBottom: activeTab === 'business' ? '3px solid var(--color-copper)' : '3px solid transparent',
              background: activeTab === 'business' ? '#ffffff' : 'transparent',
              color: activeTab === 'business' ? 'var(--color-forest)' : '#64748B',
              fontWeight: activeTab === 'business' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              borderRadius: activeTab === 'business' ? '6px 6px 0 0' : '0',
              boxShadow: activeTab === 'business' ? '0 -2px 6px rgba(0,0,0,0.03)' : 'none'
            }}
          >
            🏢 Business & GST Profile
          </button>
        </div>

        {/* Modal Scrollable Body - Completely Opaque Solid White */}
        <div style={{ padding: '22px 24px', overflowY: 'auto', flex: 1, backgroundColor: '#ffffff' }}>
          {/* ================================================================ */}
          {/* TAB 1: STAFF & ROLE MANAGEMENT WITH 2-STEP OTP */}
          {/* ================================================================ */}
          {activeTab === 'staff' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, color: 'var(--color-forest)' }}>
                    Authorized Store Staff
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                    Staff are authorized via SMS OTP sent to your phone. Cashiers can only access invoicing; Storekeepers can manage stock.
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
                    padding: '18px',
                    marginBottom: '22px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-forest)' }}>
                      🛡️ 2-Step Employee Onboarding
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Employee Full Name *</label>
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
                        <label className="form-label">Role & Access Level *</label>
                        <select
                          className="form-select"
                          value={staffForm.role}
                          onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                        >
                          <option value="staff">Billing Cashier (Invoicing Only)</option>
                          <option value="inventory_manager">Storekeeper (Stock & Catalog)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Login Username *</label>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Employee Phone (Optional, for Forgot Password)</label>
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

                    {/* Step 1 & Step 2 OTP Verification Box */}
                    <div
                      style={{
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '8px',
                        padding: '14px',
                        marginTop: '12px'
                      }}
                    >
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E40AF', marginBottom: '4px' }}>
                        Admin Authorization Code
                      </div>
                      <p style={{ fontSize: '11.5px', color: '#3B82F6', margin: 0, marginBottom: '10px' }}>
                        A 6-digit confirmation code will be sent to the Admin's registered mobile ({business?.phone || 'Configured Phone'}) to approve this staff account.
                      </p>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        {!otpInfo ? (
                          <button
                            type="button"
                            disabled={isSendingOtp}
                            onClick={handleSendOtp}
                            className="btn btn-secondary btn-sm"
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            {isSendingOtp ? '📲 Sending SMS...' : '📲 Send Authorization OTP'}
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}>
                            <div style={{ flex: 1 }}>
                              <input
                                type="text"
                                required
                                maxLength={6}
                                className="form-input"
                                placeholder="Enter 6-digit OTP code"
                                value={staffForm.otp}
                                onChange={(e) => setStaffForm({ ...staffForm, otp: e.target.value })}
                                style={{
                                  letterSpacing: '0.25em',
                                  fontWeight: 700,
                                  fontFamily: 'var(--font-mono)',
                                  textAlign: 'center',
                                  fontSize: '15px'
                                }}
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={isSubmittingStaff}
                              className="btn btn-primary btn-sm"
                              style={{ whiteSpace: 'nowrap' }}
                            >
                              {isSubmittingStaff ? 'Verifying...' : '✓ Authorize & Create Staff'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Demo OTP Helper if in simulation mode */}
                      {otpInfo && otpInfo.demo_otp && (
                        <div style={{ marginTop: '10px', fontSize: '11px', color: '#047857', backgroundColor: '#ECFDF5', padding: '6px 10px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                          ℹ️ <b>Demo Code:</b> <code>{otpInfo.demo_otp}</code> (Simulation active).
                        </div>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {/* Direct Staff Password Reset Modal / Dialog */}
              {resetTargetStaff && (
                <div
                  style={{
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    borderRadius: '10px',
                    padding: '16px',
                    marginBottom: '20px',
                    boxShadow: '0 4px 12px rgba(180, 83, 9, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#92400E' }}>
                      🔑 Reset Password for @{resetTargetStaff.username} ({resetTargetStaff.full_name})
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setResetTargetStaff(null);
                        setNewStaffPassword('');
                      }}
                      style={{ background: 'none', border: 'none', color: '#92400E', cursor: 'pointer', fontSize: '13px' }}
                    >
                      ✕
                    </button>
                  </div>
                  <p style={{ fontSize: '11.5px', color: '#78350F', margin: '0 0 10px 0' }}>
                    As the Store Admin, you can set a brand new password directly for this employee.
                  </p>

                  <form onSubmit={handleResetStaffPassword} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                      style={{ whiteSpace: 'nowrap', backgroundColor: 'var(--color-copper)' }}
                    >
                      {isResettingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </div>
              )}

              {/* Roster of Active & Deactivated Staff */}
              {loadingStaff ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)' }}>
                  Loading staff roster from MongoDB...
                </div>
              ) : staffList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#F8F6F0', borderRadius: '8px', color: 'var(--color-muted)' }}>
                  No staff members currently registered under this business. Click <b>"+ Add Staff Member"</b> above to grant employee access.
                </div>
              ) : (
                <div style={{ border: '1px solid var(--color-stone)', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                  <table className="table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#F8F6F0' }}>
                      <tr>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', color: 'var(--color-forest)', fontWeight: 700 }}>Employee</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', color: 'var(--color-forest)', fontWeight: 700 }}>Username</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', color: 'var(--color-forest)', fontWeight: 700 }}>Role</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', color: 'var(--color-forest)', fontWeight: 700 }}>Status</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '12px', color: 'var(--color-forest)', fontWeight: 700 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffList.map((st) => {
                        const isActive = st.is_active !== false;
                        return (
                          <tr key={st.id} style={{ borderBottom: '1px solid #F1EFE9', backgroundColor: '#ffffff' }}>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>{st.full_name}</div>
                              {st.phone && <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Tel: {st.phone}</div>}
                            </td>
                            <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#334155' }}>
                              @{st.username}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: st.role === 'inventory_manager' ? '#FEF3C7' : '#E0E7FF',
                                  color: st.role === 'inventory_manager' ? '#92400E' : '#3730A3'
                                }}
                              >
                                {st.role === 'inventory_manager' ? 'Storekeeper' : 'Billing Cashier'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2',
                                  color: isActive ? '#15803D' : '#B91C1C'
                                }}
                              >
                                {isActive ? '● Active' : '○ Deactivated'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                {/* Reset Staff Password Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResetTargetStaff(st);
                                    setNewStaffPassword('');
                                  }}
                                  className="btn btn-ghost btn-sm"
                                  style={{
                                    fontSize: '11px',
                                    color: '#B45309',
                                    padding: '3px 8px',
                                    backgroundColor: '#FEF3C7',
                                    border: '1px solid #FDE68A'
                                  }}
                                  title="Reset this employee's password directly"
                                >
                                  🔑 Reset Pwd
                                </button>

                                {/* Deactivate / Reactivate Access */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(st.id, isActive, st.full_name)}
                                  className="btn btn-ghost btn-sm"
                                  style={{
                                    fontSize: '11px',
                                    color: isActive ? '#DC2626' : '#16A34A',
                                    padding: '3px 8px',
                                    backgroundColor: isActive ? '#FEE2E2' : '#DCFCE7'
                                  }}
                                  title={isActive ? 'Deactivate staff login access' : 'Reactivate staff login access'}
                                >
                                  {isActive ? 'Deactivate' : 'Activate'}
                                </button>

                                {/* Delete Staff Button */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStaff(st.id, st.full_name)}
                                  className="btn btn-ghost btn-sm"
                                  style={{ fontSize: '12px', color: '#94A3B8', padding: '3px 6px' }}
                                  title="Permanently remove staff"
                                >
                                  🗑️
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
          {/* TAB 2: BUSINESS & GST PROFILE */}
          {/* ================================================================ */}
          {activeTab === 'business' && (
            <form onSubmit={handleSaveBizSettings}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Business / Shop Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={bizForm.business_name}
                    onChange={(e) => setBizForm({ ...bizForm, business_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">State (Place of Business) *</label>
                  <select
                    className="form-select"
                    required
                    value={bizForm.state}
                    onChange={(e) => setBizForm({ ...bizForm, state: e.target.value })}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">GSTIN (Optional)</label>
                  <input
                    type="text"
                    maxLength={15}
                    className="form-input"
                    placeholder="15-digit GSTIN"
                    value={bizForm.gstin}
                    onChange={(e) => setBizForm({ ...bizForm, gstin: e.target.value.toUpperCase() })}
                  />
                </div>

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
                  <label className="form-label">Invoice Prefix</label>
                  <input
                    type="text"
                    className="form-input"
                    value={bizForm.invoice_prefix}
                    onChange={(e) => setBizForm({ ...bizForm, invoice_prefix: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Business Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Market road, shop number, city, pincode"
                  value={bizForm.address}
                  onChange={(e) => setBizForm({ ...bizForm, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Business Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={bizForm.email}
                    onChange={(e) => setBizForm({ ...bizForm, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">UPI ID (for bill QR)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. store@upi"
                    value={bizForm.upi_id}
                    onChange={(e) => setBizForm({ ...bizForm, upi_id: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Bank Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={bizForm.bank_name}
                    onChange={(e) => setBizForm({ ...bizForm, bank_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Account No</label>
                  <input
                    type="text"
                    className="form-input"
                    value={bizForm.bank_account_no}
                    onChange={(e) => setBizForm({ ...bizForm, bank_account_no: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">IFSC Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={bizForm.bank_ifsc}
                    onChange={(e) => setBizForm({ ...bizForm, bank_ifsc: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="submit" disabled={isSavingBiz} className="btn btn-primary">
                  {isSavingBiz ? 'Saving Settings...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminManagementModal;
