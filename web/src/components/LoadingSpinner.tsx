'use client';
import React from 'react';

export default function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
      <div className="spinner"></div>
      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{text}</span>
    </div>
  );
}
