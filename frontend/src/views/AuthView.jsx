import React, { useState } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { STATES_LIST, UT_LIST } from '../constants/states';
import { PasswordInput } from '../components/PasswordInput';

export const AuthView = () => {
  const { login, signup } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState('login'); // 'login', 'signup', or 'forgot'
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

  // Forgot Password State
  const [forgotStep, setForgotStep] = useState(1); // 1: Send OTP, 2: Verify & Reset
  const [forgotForm, setForgotForm] = useState({
    username: '',
    otp: '',
    new_password: '',
    confirm_password: ''
  });
  const [forgotOtpInfo, setForgotOtpInfo] = useState(null);

  const switchMode = (newMode) => {
    setMode(newMode);
    if (newMode !== 'login') setLoginForm({ ...emptyLogin });
    if (newMode !== 'signup') setSignupForm({ ...emptySignup });
    if (newMode !== 'forgot') {
      setForgotStep(1);
      setForgotForm({ username: '', otp: '', new_password: '', confirm_password: '' });
      setForgotOtpInfo(null);
    }
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
      showToast('Please fill in username, password, and owner name.', 'warning');
      return;
    }
    if (!signupForm.business_name.trim() || !signupForm.phone.trim() || !signupForm.state.trim()) {
      showToast('Please fill in all mandatory business fields (Business Name, Phone, and State).', 'warning');
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

  // Step 1: Send OTP for password recovery
  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    const cleanUser = forgotForm.username.trim();
    if (!cleanUser) {
      showToast('Please enter your account username.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to send verification code.');
      }
      setForgotOtpInfo(data);
      setForgotStep(2);
      showToast(data.message, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP and set new password
  const handleForgotVerifyReset = async (e) => {
    e.preventDefault();
    if (!forgotForm.otp.trim()) {
      showToast('Please enter the 6-digit verification OTP.', 'warning');
      return;
    }
    if (forgotForm.new_password.length < 6) {
      showToast('New password must be at least 6 characters long.', 'warning');
      return;
    }
    if (forgotForm.new_password !== forgotForm.confirm_password) {
      showToast('New passwords do not match. Please retype them carefully.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/verify-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: forgotForm.username.trim(),
          otp: forgotForm.otp.trim(),
          new_password: forgotForm.new_password
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to reset password.');
      }
      showToast(data.message, 'success');

      // Pre-populate login form with username
      setLoginForm({
        username: forgotForm.username.trim(),
        password: ''
      });
      switchMode('login');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
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
          maxWidth: mode === 'signup' ? '560px' : '420px',
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 12px 40px rgba(36, 60, 50, 0.1)',
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
                width: '44px',
                height: '44px',
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
        <div style={{ padding: '26px 28px' }}>
          {/* ================================================================ */}
          {/* MODE 1: SIGN IN (WITH FORGOT PASSWORD LINK & PASSWORD EYE ICON) */}
          {/* ================================================================ */}
          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-forest)', margin: 0 }}>
                  Welcome Back
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '3px' }}>
                  Sign in as Owner or Staff to access your business ledger.
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Password</label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: '11.5px',
                      color: 'var(--color-copper)',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <PasswordInput
                  required
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '16px', padding: '10px' }}
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In to Ledger →'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '12.5px', color: 'var(--color-muted)' }}>
                Need a new business ledger?{' '}
                <span
                  onClick={() => switchMode('signup')}
                  style={{ color: 'var(--color-copper)', fontWeight: 700, cursor: 'pointer' }}
                >
                  Register Business
                </span>
              </div>
            </form>
          )}

          {/* ================================================================ */}
          {/* MODE 2: FORGOT PASSWORD (ADMINISTRATOR ONLY)                     */}
          {/* ================================================================ */}
          {mode === 'forgot' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-forest)', margin: 0 }}>
                  Admin Password Recovery
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '3px' }}>
                  {forgotStep === 1
                    ? 'Enter your Admin username to receive an SMS verification code.'
                    : `Enter the code sent to Admin mobile ending in •••• ${forgotOtpInfo?.phone_hint || '••••'}.`}
                </p>
              </div>

              {/* Staff Guidance Notice */}
              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1E40AF',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  marginBottom: '16px',
                  lineHeight: '1.4'
                }}
              >
                ℹ️ <b>Employee Notice:</b> Staff passwords can only be changed by the Store Administrator. If you forgot your password, please ask your store Admin to reset it for you.
              </div>

              {/* Step 1: Request OTP by Username */}
              {forgotStep === 1 && (
                <form onSubmit={handleForgotSendOtp}>
                  <div className="form-group">
                    <label className="form-label">Administrator Username</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. admin"
                      value={forgotForm.username}
                      onChange={(e) => setForgotForm({ ...forgotForm, username: e.target.value })}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '5px' }}>
                      💡 A 6-digit OTP will be sent to the business mobile registered with this Admin account.
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '14px', padding: '10px' }}
                  >
                    {isSubmitting ? 'Verifying...' : 'Send Admin OTP 📲'}
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '12px',
                        color: 'var(--color-forest)',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Validate OTP & Set New Password */}
              {forgotStep === 2 && (
                <form onSubmit={handleForgotVerifyReset}>
                  <div className="form-group">
                    <label className="form-label">6-Digit Verification Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      className="form-input"
                      placeholder="••••••"
                      value={forgotForm.otp}
                      onChange={(e) => setForgotForm({ ...forgotForm, otp: e.target.value })}
                      style={{
                        letterSpacing: '0.25em',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        fontSize: '16px'
                      }}
                    />
                  </div>

                  {forgotOtpInfo && forgotOtpInfo.demo_otp && (
                    <div
                      style={{
                        backgroundColor: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        color: '#065F46',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        marginBottom: '12px'
                      }}
                    >
                      ℹ️ <b>Demo Mode Code:</b> <code>{forgotOtpInfo.demo_otp}</code> (Simulation active).
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <PasswordInput
                      required
                      minLength={6}
                      placeholder="Min 6 characters"
                      value={forgotForm.new_password}
                      onChange={(e) => setForgotForm({ ...forgotForm, new_password: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <PasswordInput
                      required
                      minLength={6}
                      placeholder="Re-type new password"
                      value={forgotForm.confirm_password}
                      onChange={(e) => setForgotForm({ ...forgotForm, confirm_password: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '16px', padding: '10px' }}
                  >
                    {isSubmitting ? 'Resetting Password...' : 'Save New Password & Log In 🔐'}
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
                    >
                      ← Re-enter Username
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      style={{ background: 'none', border: 'none', color: 'var(--color-forest)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Cancel & Return
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* MODE 3: SIGN UP (NEW BUSINESS OWNER & ADMIN REGISTRATION)        */}
          {/* ================================================================ */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup}>
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-forest)', margin: 0 }}>
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
                    <PasswordInput
                      required
                      minLength={6}
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

export default AuthView;
