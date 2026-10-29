import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const AuthView = () => {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('signup'); // 'login' or 'signup'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login form state
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });

  // Sign up form state
  const [signupForm, setSignupForm] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'admin',
    business_name: '',
    gstin: '',
    phone: '',
    email: '',
    state: 'Maharashtra',
    address: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) return;
    setIsSubmitting(true);
    await login(loginForm.username, loginForm.password);
    setIsSubmitting(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!signupForm.username || !signupForm.password || !signupForm.full_name) return;
    setIsSubmitting(true);
    await signup(signupForm);
    setIsSubmitting(false);
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
            padding: '24px 28px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-copper)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '18px',
                fontFamily: 'var(--font-heading)'
              }}
            >
              HK
            </div>
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
              backgroundColor: 'rgba(0,0,0,0.2)',
              padding: '3px',
              borderRadius: '6px'
            }}
          >
            <button
              type="button"
              onClick={() => setMode('login')}
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
              onClick={() => setMode('signup')}
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
                  placeholder="Enter your username"
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
                  onClick={() => setMode('signup')}
                  style={{ color: 'var(--color-copper)', fontWeight: 700, cursor: 'pointer' }}
                >
                  Create one now
                </span>
              </div>
            </form>
          ) : (
            /* Sign Up / Registration Form */
            <form onSubmit={handleSignup}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-forest)', margin: 0 }}>
                  Create Business Account
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                  Enter your details to create an account and configure your business.
                </p>
              </div>

              {/* User credentials */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. rahul123"
                    value={signupForm.username}
                    onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Rahul Sharma"
                    value={signupForm.full_name}
                    onChange={(e) => setSignupForm({ ...signupForm, full_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Account Role *</label>
                  <select
                    className="form-select"
                    value={signupForm.role}
                    onChange={(e) => setSignupForm({ ...signupForm, role: e.target.value })}
                  >
                    <option value="admin">Admin (Business Owner)</option>
                    <option value="staff">Staff (Billing Operator)</option>
                  </select>
                </div>
              </div>

              {/* Business details section */}
              <div style={{ borderTop: '1px solid var(--color-stone-light)', paddingTop: '14px', marginTop: '6px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Business / Store Information (Optional)
                </div>

                <div className="form-group">
                  <label className="form-label">Business / Shop Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Shree Ganesh Traders"
                    value={signupForm.business_name}
                    onChange={(e) => setSignupForm({ ...signupForm, business_name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Business GSTIN</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 27AAAAA0000A1Z5"
                      maxLength={15}
                      value={signupForm.gstin}
                      onChange={(e) => setSignupForm({ ...signupForm, gstin: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">State (Place of Business)</label>
                    <select
                      className="form-select"
                      value={signupForm.state}
                      onChange={(e) => setSignupForm({ ...signupForm, state: e.target.value })}
                    >
                      <option value="Maharashtra">Maharashtra (27)</option>
                      <option value="Delhi">Delhi (07)</option>
                      <option value="Gujarat">Gujarat (24)</option>
                      <option value="Karnataka">Karnataka (29)</option>
                      <option value="Tamil Nadu">Tamil Nadu (33)</option>
                      <option value="Uttar Pradesh">Uttar Pradesh (09)</option>
                      <option value="Punjab">Punjab (03)</option>
                      <option value="West Bengal">West Bengal (19)</option>
                      <option value="Rajasthan">Rajasthan (08)</option>
                      <option value="Other">Other State</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 9876543210"
                      value={signupForm.phone}
                      onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="e.g. shop@gmail.com"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '14px', padding: '11px' }}
              >
                {isSubmitting ? 'Creating Account...' : 'Complete Sign Up & Enter →'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '12.5px', color: 'var(--color-muted)' }}>
                Already registered?{' '}
                <span
                  onClick={() => setMode('login')}
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
