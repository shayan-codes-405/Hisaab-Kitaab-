import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { STATES_LIST, UT_LIST } from '../constants/states';

export const AdminManagementModal = ({ isOpen, onClose }) => {
  const { business, refreshBusiness, apiFetch } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('staff'); // 'staff', 'business', 'sms'

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
      // If masked key, don't overwrite
      if (payload.textbee_api_key.startsWith('•')) {
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
      showToast('Business & SMS settings updated successfully!', 'success');
      await refreshBusiness();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSavingBiz(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '720px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '12px'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            backgroundColor: 'var(--color-forest)',
            color: '#ffffff',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
              ⚙️ Business & Staff Security Center
            </h3>
            <p style={{ margin: 0, fontSize: '11.5px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
              {business?.business_name || 'My Business'} • Owner Controls
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '18px',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-stone-light)',
            backgroundColor: 'var(--color-ivory)',
            padding: '8px 16px 0 16px',
            gap: '8px'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'staff' ? '3px solid var(--color-copper)' : '3px solid transparent',
              background: 'transparent',
              color: activeTab === 'staff' ? 'var(--color-forest)' : 'var(--color-charcoal-muted)',
              fontWeight: activeTab === 'staff' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            👥 Staff & Roles (2-Step OTP)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('business')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'business' ? '3px solid var(--color-copper)' : '3px solid transparent',
              background: 'transparent',
              color: activeTab === 'business' ? 'var(--color-forest)' : 'var(--color-charcoal-muted)',
              fontWeight: activeTab === 'business' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            🏢 Business & GST Profile
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sms')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'sms' ? '3px solid var(--color-copper)' : '3px solid transparent',
              background: 'transparent',
              color: activeTab === 'sms' ? 'var(--color-forest)' : 'var(--color-charcoal-muted)',
              fontWeight: activeTab === 'sms' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            📲 TextBee SMS Gateway
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* ================================================================ */}
          {/* TAB 1: STAFF & ROLE MANAGEMENT WITH 2-STEP OTP */}
          {/* ================================================================ */}
          {activeTab === 'staff' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-forest)' }}>
                    Staff Member Authorization
                  </h4>
                  <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--color-muted)', marginTop: '2px' }}>
                    Only verified staff authorized via SMS OTP sent to your phone can access your store ledger.
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
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-forest)' }}>
                      🛡️ 2-Step Staff Member Registration
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Cancel
                    </button>
                  </div>

                  <form onSubmit={handleCreateStaff}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
                        <input
                          type="password"
                          required
                          minLength={6}
                          className="form-input"
                          placeholder="Min 6 characters"
                          value={staffForm.password}
                          onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Step 1 & Step 2 OTP Verification Box */}
                    <div
                      style={{
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '6px',
                        padding: '12px',
                        marginTop: '10px'
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF', marginBottom: '6px' }}>
                        Step 1: Admin SMS OTP Authorization
                      </div>
                      <p style={{ fontSize: '11px', color: '#3B82F6', margin: 0, marginBottom: '10px' }}>
                        To prevent unauthorized employee creation, TextBee will send a 6-digit confirmation code to the Admin's registered phone ({business?.phone || 'Configured Phone'}).
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
                                  letterSpacing: '0.2em',
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
                        <div style={{ marginTop: '8px', fontSize: '11px', color: '#047857', backgroundColor: '#ECFDF5', padding: '6px 8px', borderRadius: '4px' }}>
                          ℹ️ <b>Demo Mode OTP:</b> <code>{otpInfo.demo_otp}</code> (Type this into the box above to verify).
                        </div>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {/* Roster of Active & Deactivated Staff */}
              {loadingStaff ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-muted)' }}>
                  Loading staff roster from MongoDB...
                </div>
              ) : staffList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', backgroundColor: 'var(--color-ivory)', borderRadius: '8px', color: 'var(--color-muted)' }}>
                  No staff members currently registered under this business. Click <b>"+ Add Staff Member"</b> above to grant employee access.
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffList.map((st) => {
                        const isActive = st.is_active !== false;
                        return (
                          <tr key={st.id}>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>{st.full_name}</div>
                              {st.phone && <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Tel: {st.phone}</div>}
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                              @{st.username}
                            </td>
                            <td>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: st.role === 'inventory_manager' ? '#FEF3C7' : '#E0E7FF',
                                  color: st.role === 'inventory_manager' ? '#92400E' : '#3730A3'
                                }}
                              >
                                {st.role === 'inventory_manager' ? 'Storekeeper' : 'Billing Cashier'}
                              </span>
                            </td>
                            <td>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2',
                                  color: isActive ? '#15803D' : '#B91C1C'
                                }}
                              >
                                {isActive ? '● Active' : '○ Deactivated'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(st.id, isActive, st.full_name)}
                                  className="btn btn-ghost btn-sm"
                                  style={{
                                    fontSize: '11px',
                                    color: isActive ? '#DC2626' : '#16A34A',
                                    padding: '3px 8px'
                                  }}
                                  title={isActive ? 'Deactivate access' : 'Reactivate access'}
                                >
                                  {isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStaff(st.id, st.full_name)}
                                  className="btn btn-ghost btn-sm"
                                  style={{ fontSize: '11px', color: '#94A3B8', padding: '3px 6px' }}
                                  title="Permanently remove"
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
                  <label className="form-label">UPI ID (for bill payment)</label>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="submit" disabled={isSavingBiz} className="btn btn-primary">
                  {isSavingBiz ? 'Saving Settings...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}

          {/* ================================================================ */}
          {/* TAB 3: TEXTBEE SMS GATEWAY SETTINGS */}
          {/* ================================================================ */}
          {activeTab === 'sms' && (
            <form onSubmit={handleSaveBizSettings}>
              <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                  📲 TextBee Android Gateway Connection
                </div>
                <div style={{ fontSize: '12px', color: '#15803D', lineHeight: 1.4 }}>
                  Connect your Android phone with the TextBee app to send real SMS invoice receipts and staff verification OTPs automatically from your mobile number.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">TextBee Device ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Device ID from Android App"
                    value={bizForm.textbee_device_id}
                    onChange={(e) => setBizForm({ ...bizForm, textbee_device_id: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">TextBee API Key</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="txb_••••••••"
                    value={bizForm.textbee_api_key}
                    onChange={(e) => setBizForm({ ...bizForm, textbee_api_key: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                <input
                  type="checkbox"
                  id="modal-textbee-demo"
                  checked={bizForm.textbee_demo_mode}
                  onChange={(e) => setBizForm({ ...bizForm, textbee_demo_mode: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="modal-textbee-demo" style={{ fontSize: '12.5px', color: 'var(--color-charcoal)', cursor: 'pointer' }}>
                  <b>Enable Safe Demo / Simulation Mode:</b> Logs SMS and OTPs safely into MongoDB without consuming actual SIM card SMS credits.
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="submit" disabled={isSavingBiz} className="btn btn-primary">
                  {isSavingBiz ? 'Updating Gateway...' : 'Save SMS Configuration'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
