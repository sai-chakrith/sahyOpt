'use client';
import React from 'react';

interface BudgetSliderProps {
  value: number;
  onChange: (val: number) => void;
}

export default function BudgetSlider({ value, onChange }: BudgetSliderProps) {
  return (
    <div className="slider-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label className="stat-label">Budget (Max Reserves)</label>
        <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-primary)', fontFamily: 'var(--font-outfit)' }}>
          {value}
        </span>
      </div>
      <input 
        type="range" 
        min="1" 
        max="100" 
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="slider"
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>1</span>
        <span>20</span>
        <span>40</span>
        <span>60</span>
        <span>80</span>
        <span>100</span>
      </div>
    </div>
  );
}
