'use client';
import React from 'react';

interface ModelToggleProps {
  value: 'set_covering' | 'mclp';
  onChange: (value: 'set_covering' | 'mclp') => void;
}

export default function ModelToggle({ value, onChange }: ModelToggleProps) {
  return (
    <div className="toggle-group" style={{ marginBottom: '2rem' }}>
      <div
        className="toggle-indicator"
        style={{
          width: '50%',
          transform: value === 'set_covering' ? 'translateX(0)' : 'translateX(100%)'
        }}
      />
      <button
        id="toggle-set-covering"
        className={`toggle-btn ${value === 'set_covering' ? 'active' : ''}`}
        onClick={() => onChange('set_covering')}
      >
        <div style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Set Covering</div>
        <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 'normal' }}>Minimum Reserves for Full Coverage</div>
      </button>
      <button
        id="toggle-mclp"
        className={`toggle-btn ${value === 'mclp' ? 'active' : ''}`}
        onClick={() => onChange('mclp')}
      >
        <div style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>MCLP</div>
        <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 'normal' }}>Maximum Coverage Under Budget</div>
      </button>
    </div>
  );
}
