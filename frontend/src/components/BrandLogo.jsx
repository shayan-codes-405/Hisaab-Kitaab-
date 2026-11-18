import React from 'react';

export const BrandLogo = ({
  size = 36,
  showText = true,
  textColor = '#0F172A',
  subtitle = 'Enterprise Commerce',
  collapsed = false
}) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', userSelect: 'none' }}>
      {/* Sleek Vector Brand Emblem */}
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.28)}px`,
          background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 55%, #3B82F6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
          flexShrink: 0,
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
        title="HisabKitab Platform"
      >
        <svg
          width={Math.round(size * 0.58)}
          height={Math.round(size * 0.58)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <line x1="9" y1="7" x2="15" y2="7" />
          <line x1="9" y1="11" x2="13" y2="11" />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && !collapsed && (
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: `${Math.max(15, Math.round(size * 0.46))}px`,
              letterSpacing: '-0.025em',
              color: textColor,
              lineHeight: 1.15,
              whiteSpace: 'nowrap'
            }}
          >
            HisabKitab
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: `${Math.max(10, Math.round(size * 0.28))}px`,
                color: textColor === '#FFFFFF' ? 'rgba(255, 255, 255, 0.7)' : '#64748B',
                fontWeight: 600,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                letterSpacing: '0.01em'
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
