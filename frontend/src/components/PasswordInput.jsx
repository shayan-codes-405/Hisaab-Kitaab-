import React, { useState } from 'react';

export const PasswordInput = ({
  value,
  onChange,
  placeholder = '••••••••',
  required = false,
  minLength,
  name,
  id,
  className = 'form-input',
  style = {},
  autoComplete
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        name={name}
        id={id}
        autoComplete={autoComplete}
        className={className}
        style={{
          width: '100%',
          paddingRight: '38px',
          ...style
        }}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        tabIndex="-1"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        title={showPassword ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute',
          right: '8px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: showPassword ? 'var(--color-copper)' : '#64748B',
          borderRadius: '4px',
          transition: 'color 0.15s ease'
        }}
      >
        {showPassword ? (
          /* Eye Off (Hide) Icon */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        ) : (
          /* Eye (Show) Icon */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        )}
      </button>
    </div>
  );
};

export default PasswordInput;
