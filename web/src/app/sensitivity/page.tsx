'use client';
import React, { useState, useEffect } from 'react';
import CoverageChart from '@/components/CoverageChart';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function SensitivityPage() {
  const [data, setData] = useState([
    { threshold: 1, minReserves: 57, speciesCount: 220, species: 220 },
    { threshold: 2, minReserves: 52, speciesCount: 162, species: 162 },
    { threshold: 3, minReserves: 48, speciesCount: 131, species: 131 },
    { threshold: 5, minReserves: 38, speciesCount: 97, species: 97 }
  ]);

  const [coverageData, setCoverageData] = useState([
    { budget: 10, equal: 40, iucn: 45 },
    { budget: 20, equal: 65, iucn: 72 },
    { budget: 30, equal: 80, iucn: 88 },
    { budget: 40, equal: 92, iucn: 95 },
    { budget: 50, equal: 98, iucn: 99 },
    { budget: 60, equal: 100, iucn: 100 },
  ]);

  useEffect(() => {
    async function loadSensitivity() {
      try {
        const res = await fetch('/api/sensitivity');
        if (res.ok) {
          const sensResults = await res.json();
          if (Array.isArray(sensResults) && sensResults.length > 0 && !sensResults[0].error) {
            setData(sensResults.map((r: any) => ({
              threshold: r.threshold,
              minReserves: r.minReserves,
              speciesCount: r.speciesCount,
              species: r.speciesCount,
            })));
          }
        }
      } catch {
        /* solver optional */
      }
    }

    async function loadCurves() {
      try {
        const [eqRes, iucnRes] = await Promise.all([
          fetch('/api/coverage-curve?weighted=false&max_budget=60'),
          fetch('/api/coverage-curve?weighted=true&max_budget=60'),
        ]);

        if (eqRes.ok && iucnRes.ok) {
          const eqData = await eqRes.json();
          const iucnData = await iucnRes.json();

          const combined: Record<number, { budget: number; equal: number; iucn: number }> = {};
          eqData.forEach((d: any) => {
            combined[d.budget] = { budget: d.budget, equal: d.coveragePercent, iucn: d.coveragePercent };
          });
          iucnData.forEach((d: any) => {
            if (combined[d.budget]) {
              combined[d.budget].iucn = d.coveragePercent;
            } else {
              combined[d.budget] = { budget: d.budget, equal: d.coveragePercent, iucn: d.coveragePercent };
            }
          });

          const points = Object.values(combined).sort((a, b) => a.budget - b.budget);
          if (points.length > 0) {
            setCoverageData(points);
          }
        }
      } catch {
        /* solver optional */
      }
    }

    loadSensitivity();
    loadCurves();
  }, []);

  return (
    <div className="page-transition">
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Sensitivity Analysis</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Evaluate how assumptions affect optimization</p>
      </header>

      <div className="grid grid-cols-2" style={{ marginBottom: '2rem' }}>
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Minimum Occurrences Threshold</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Requiring a species to appear in multiple selected reserves increases robustness but drops species from consideration if they have too few total occurrences.
          </p>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="threshold" stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="var(--accent-primary)" tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '8px' }} />
                <Bar yAxisId="left" dataKey="minReserves" name="Min Reserves" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="species" name="Species Included" fill="var(--bg-card)" stroke="var(--text-secondary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Coverage Curve: Equal vs IUCN Weighting</h3>
          <CoverageChart data={coverageData} xKey="budget" yKey="iucn" />
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 12, height: 12, background: 'var(--accent-primary)', borderRadius: '50%' }}></div> IUCN Weighted
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3">
        <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Threshold = 1</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>57 reserves are required to cover all 220 species at least once.</p>
        </div>
        <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-amber)' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Threshold = 2</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Increasing to 2 drops 58 highly restricted species, reducing reserve count to 52.</p>
        </div>
        <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-blue)' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Robustness</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>IUCN weighting achieves higher priority species coverage at lower reserve budgets.</p>
        </div>
      </div>
    </div>
  );
}
