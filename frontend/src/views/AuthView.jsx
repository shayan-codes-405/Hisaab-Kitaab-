import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import { STATES_LIST, UT_LIST } from '../constants/states';

export const AuthView = () => {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('signup'); // 'login' or 'signup'
  const [signupType, setSignupType] = useState('new_business'); // 'new_business' or 'join_staff'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableBusinesses, setAvailableBusinesses] = useState([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);

  // Blank initial forms
  const emptyLogin = {
    username: '',
    password: ''
  };

  const emptySignup = {
    username: '',
    password: '',
    full_name: '',
    signup_type: 'new_business',
    business_id: '',
    business_name: '',
    gstin: '',
    phone: '',
    email: '',
    state: 'Maharashtra',
    address: ''
  };

  // Form states
  const [loginForm, setLoginForm] = useState(emptyLogin);
  const [signupForm, setSignupForm] = useState(emptySignup);

  // Fetch list of registered businesses for staff registration
  const fetchBusinesses = async () => {
    setLoadingBusinesses(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/businesses`);
      if (res.ok) {
        const data = await res.json();
        setAvailableBusinesses(data || []);
        if (data && data.length > 0 && !signupForm.business_id) {
          setSignupForm((prev) => ({ ...prev, business_id: data[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load registered businesses:', err);
    } finally {
      setLoadingBusinesses(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const switchMode = (newMode) => {
    setMode(newMode);
    setLoginForm({ ...emptyLogin });
    setSignupForm({ ...emptySignup, signup_type: signupType });
    if (newMode === 'signup') {
      fetchBusinesses();
    }
  };

  const switchSignupType = (type) => {
    setSignupType(type);
    setSignupForm((prev) => ({
      ...prev,
      signup_type: type,
      business_id: type === 'join_staff' && availableBusinesses.length > 0 ? (prev.business_id || availableBusinesses[0].id) : ''
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) return;
    setIsSubmitting(true);
    const success = await login(loginForm.username, loginForm.password);
    setIsSubmitting(false);
    if (success) {
      setLoginForm({ ...emptyLogin });
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!signupForm.username.trim() || !signupForm.password.trim() || !signupForm.full_name.trim()) {
      return;
    }

    if (signupType === 'new_business') {
      if (!signupForm.business_name.trim() || !signupForm.phone.trim() || !signupForm.state.trim()) {
        return;
      }
    } else if (signupType === 'join_staff') {
      if (!signupForm.business_id) {
        alert('Please select a registered business from the dropdown to join as staff.');
        return;
      }
    }

    setIsSubmitting(true);
    const payload = {
      ...signupForm,
      signup_type: signupType,
      role: signupType === 'new_business' ? 'admin' : 'staff'
    };

    const success = await signup(payload);
    setIsSubmitting(false);
    if (success) {
      setSignupForm({ ...emptySignup });
      setLoginForm({ ...emptyLogin });
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-ivory)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: mode === 'signup' ? '580px' : '400px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(36, 60, 50, 0.08)',
          border: '1px solid var(--color-stone)',
          overflow: 'hidden',
          transition: 'all 0.25s ease'
        }}
      >
        {/* Brand Banner */}
        <div
          style={{
            backgroundColor: 'var(--color-forest)',
            padding: '22px 28px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/logo.png"
              alt="HisabKitab Logo"
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                objectFit: 'cover',
                boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
                backgroundColor: '#ffffff'
              }}
            />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                HisabKitab
              </h2>
              <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                GST Invoicing & Inventory Ledger
              </p>
            </div>
          </div>

          {/* Toggle pill */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'rgba(0,0,0,0.25)',
              padding: '3px',
              borderRadius: '6px'
            }}
          >
            <button
              type="button"
              onClick={() => switchMode('login')}
              style={{
                border: 'none',
                background: mode === 'login' ? 'var(--color-copper)' : 'transparent',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-heading)'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              style={{
                border: 'none',
                background: mode === 'signup' ? 'var(--color-copper)' : 'transparent',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-heading)'
              }}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div style={{ padding: '24px 28px' }}>
          {mode === 'login' ? (
            /* Sign In Form */
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-forest)', margin: 0 }}>
                  Welcome Back
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                  Log in to access your business ledger and stock.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Enter your username (e.g. admin)"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  required
                  className="form-input"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '12px', padding: '10px' }}
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In to Ledger →'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12.5px', color: 'var(--color-muted)' }}>
                Don't have an account?{' '}
                <span
                  onClick={() => switchMode('signup')}
                  style={{ color: 'var(--color-copper)', fontWeight: 700, cursor: 'pointer' }}
                >
                  Create one now
                </span>
              </div>
            </form>
          ) : (
            /* Sign Up / Registration Form */
            <form onSubmit={handleSignup}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-forest)', margin: 0 }}>
                  Create Account
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                  Register a new business or join an existing business as billing staff.
                </p>
              </div>

              {/* Segmented Selection: New Business vs Join Existing */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  backgroundColor: 'var(--color-ivory-dark)',
                  padding: '4px',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}
              >
                <button
                  type="button"
                  onClick={() => switchSignupType('new_business')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: signupType === 'new_business' ? '#ffffff' : 'transparent',
                    color: signupType === 'new_business' ? 'var(--color-forest)' : 'var(--color-charcoal-muted)',
                    boxShadow: signupType === 'new_business' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    fontWeight: signupType === 'new_business' ? 700 : 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>🏢</span> Register New Business
                </button>

                <button
                  type="button"
                  onClick={() => switchSignupType('join_staff')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: signupType === 'join_staff' ? '#ffffff' : 'transparent',
                    color: signupType === 'join_staff' ? 'var(--color-forest)' : 'var(--color-charcoal-muted)',
                    boxShadow: signupType === 'join_staff' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    fontWeight: signupType === 'join_staff' ? 700 : 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>👤</span> Join Existing as Staff
                </button>
              </div>

              {/* Notice badge */}
              <div
                style={{
                  backgroundColor: signupType === 'new_business' ? '#F0FDF4' : '#EFF6FF',
                  border: `1px solid ${signupType === 'new_business' ? '#BBF7D0' : '#BFDBFE'}`,
                  color: signupType === 'new_business' ? '#166534' : '#1E40AF',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  marginBottom: '14px',
                  lineHeight: '1.4'
                }}
              >
                {signupType === 'new_business' ? (
                  <span>
                    👑 <b>New Business Setup:</b> You will become the <b>Admin & Owner</b> with full permissions to manage GST settings, inventory items, and invoices.
                  </span>
                ) : (
                  <span>
                    💼 <b>Staff Member Registration:</b> Join a registered business from MongoDB to create invoices, record sales, and monitor stock levels.
                  </span>
                )}
              </div>

              {/* BRANCH 1: NEW BUSINESS REGISTRATION */}
              {signupType === 'new_business' ? (
                <>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Business / Enterprise Details
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Business / Shop Name <span style={{ color: 'var(--color-terracotta)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. Apex Electronics, Metro Stationers"
                      value={signupForm.business_name}
                      onChange={(e) => setSignupForm({ ...signupForm, business_name: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">
                        Place of Business (State) <span style={{ color: 'var(--color-terracotta)' }}>*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={signupForm.state}
                        onChange={(e) => setSignupForm({ ...signupForm, state: e.target.value })}
                      >
                        <option value="">-- Select State or UT --</option>
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

                    <div className="form-group">
                      <label className="form-label">
                        Business Phone <span style={{ color: 'var(--color-terracotta)' }}>*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        className="form-input"
                        placeholder="e.g. 9876543210"
                        value={signupForm.phone}
                        onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">GSTIN (Optional)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="15-digit GSTIN"
                        maxLength={15}
                        value={signupForm.gstin}
                        onChange={(e) => setSignupForm({ ...signupForm, gstin: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Business Email (Optional)</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="store@business.com"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Shop Address (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Shop #12, Market Complex"
                      value={signupForm.address}
                      onChange={(e) => setSignupForm({ ...signupForm, address: e.target.value })}
                    />
                  </div>

                  {/* Owner Credentials Divider */}
                  <div style={{ borderTop: '1px solid var(--color-stone-light)', paddingTop: '12px', marginTop: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Business Owner Login Credentials
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Owner Full Name <span style={{ color: 'var(--color-terracotta)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="e.g. Rajesh Kumar"
                        value={signupForm.full_name}
                        onChange={(e) => setSignupForm({ ...signupForm, full_name: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">
                          Username <span style={{ color: 'var(--color-terracotta)' }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          placeholder="e.g. rajesh123"
                          value={signupForm.username}
                          onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          Password <span style={{ color: 'var(--color-terracotta)' }}>*</span>
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          className="form-input"
                          placeholder="Min 6 characters"
                          value={signupForm.password}
                          onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* BRANCH 2: JOIN EXISTING BUSINESS AS STAFF */
                <>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Select Business To Join
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Select Registered Business / Store <span style={{ color: 'var(--color-terracotta)' }}>*</span>
                    </label>
                    {loadingBusinesses ? (
                      <div style={{ fontSize: '12px', color: 'var(--color-muted)', padding: '8px 0' }}>
                        Loading businesses from MongoDB...
                      </div>
                    ) : availableBusinesses.length === 0 ? (
                      <div style={{ padding: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '12px', color: '#991B1B' }}>
                        No registered businesses found. Please register a new business first.
                      </div>
                    ) : (
                      <select
                        className="form-select"
                        required
                        value={signupForm.business_id}
                        onChange={(e) => setSignupForm({ ...signupForm, business_id: e.target.value })}
                      >
                        <option value="">-- Choose Registered Business --</option>
                        {availableBusinesses.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.business_name} ({b.state || 'State N/A'}{b.phone ? ` • Tel: ${b.phone}` : ''})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Staff Member Credentials Divider */}
                  <div style={{ borderTop: '1px solid var(--color-stone-light)', paddingTop: '12px', marginTop: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Staff Account Credentials
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Staff Member Full Name <span style={{ color: 'var(--color-terracotta)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="e.g. Suresh Verma"
                        value={signupForm.full_name}
                        onChange={(e) => setSignupForm({ ...signupForm, full_name: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">
                          Username <span style={{ color: 'var(--color-terracotta)' }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          placeholder="e.g. suresh_billing"
                          value={signupForm.username}
                          onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          Password <span style={{ color: 'var(--color-terracotta)' }}>*</span>
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          className="form-input"
                          placeholder="Min 6 characters"
                          value={signupForm.password}
                          onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Contact Phone (Optional)</label>
                        <input
                          type="tel"
                          className="form-input"
                          placeholder="e.g. 9876543210"
                          value={signupForm.phone}
                          onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Email (Optional)</label>
                        <input
                          type="email"
                          className="form-input"
                          placeholder="e.g. suresh@gmail.com"
                          value={signupForm.email}
                          onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isSubmitting || (signupType === 'join_staff' && availableBusinesses.length === 0)}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '16px', padding: '11px' }}
              >
                {isSubmitting
                  ? 'Creating Account...'
                  : signupType === 'new_business'
                  ? 'Register Business & Create Admin →'
                  : 'Join Store as Staff →'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '12.5px', color: 'var(--color-muted)' }}>
                Already registered?{' '}
                <span
                  onClick={() => switchMode('login')}
                  style={{ color: 'var(--color-copper)', fontWeight: 700, cursor: 'pointer' }}
                >
                  Sign in here
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
