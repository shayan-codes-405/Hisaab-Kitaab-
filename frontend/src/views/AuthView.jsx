import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { STATES_LIST, UT_LIST } from '../constants/states';

export const AuthView = () => {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('signup'); // 'login' or 'signup'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Blank initial forms
  const emptyLogin = {
    username: '',
    password: ''
  };

  const emptySignup = {
    username: '',
    password: '',
    full_name: '',
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

  const switchMode = (newMode) => {
    setMode(newMode);
    setLoginForm({ ...emptyLogin });
    setSignupForm({ ...emptySignup });
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
    if (!signupForm.business_name.trim() || !signupForm.phone.trim() || !signupForm.state.trim()) {
      alert('Please fill in all mandatory business fields (Business Name, Phone, and State).');
      return;
    }

    setIsSubmitting(true);
    const success = await signup(signupForm);
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
          maxWidth: mode === 'signup' ? '560px' : '400px',
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
                  Log in to access your business ledger, invoices, and stock.
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
                Need a new business ledger?{' '}
                <span
                  onClick={() => switchMode('signup')}
                  style={{ color: 'var(--color-copper)', fontWeight: 700, cursor: 'pointer' }}
                >
                  Register Business
                </span>
              </div>
            </form>
          ) : (
            /* Sign Up: Business Owner / Admin Registration */
            <form onSubmit={handleSignup}>
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-forest)', margin: 0 }}>
                  Register New Business
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                  Set up your business profile and create your Administrator account.
                </p>
              </div>

              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  color: '#166534',
                  padding: '7px 11px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  marginBottom: '14px',
                  lineHeight: '1.4'
                }}
              >
                👑 <b>Business Owner Setup:</b> You will become the primary Administrator with exclusive permissions to add employees, configure GST, and manage finances.
              </div>

              {/* Business Information */}
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
                  Owner / Administrator Login Credentials
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
                      placeholder="e.g. rajesh_admin"
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '16px', padding: '11px' }}
              >
                {isSubmitting ? 'Creating Business Ledger...' : 'Register Business & Create Admin →'}
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
