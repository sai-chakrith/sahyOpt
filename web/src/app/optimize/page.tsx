'use client';
import React, { useState } from 'react';
import ModelToggle from '@/components/ModelToggle';
import BudgetSlider from '@/components/BudgetSlider';
import IUCNBadge from '@/components/IUCNBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import CoverageChart from '@/components/CoverageChart';

interface OptResult {
  model: string;
  totalSelected: number;
  coveragePercent: number;
  solveTimeMs: number;
  selectedCells: string[];
  coveredSpecies: string[];
  uncoveredSpecies: string[];
  cellDetails?: { cellId: string; centroidLat: number; centroidLon: number; speciesCount: number }[];
  cached?: boolean;
}

export default function OptimizePage() {
  const [model, setModel] = useState<'set_covering' | 'mclp'>('set_covering');
  const [budget, setBudget] = useState(20);
  const [weighted, setWeighted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverageCurve, setCoverageCurve] = useState<any[]>([]);

  const runOptimization = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          budget: model === 'mclp' ? budget : undefined,
          weighted,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);

      // Also fetch coverage curve for MCLP
      if (model === 'mclp') {
        try {
          const curveRes = await fetch(`/api/coverage-curve?weighted=${weighted}&max_budget=70`);
          if (curveRes.ok) {
            const curve = await curveRes.json();
            setCoverageCurve(curve.map((d: any) => ({ budget: d.budget, coveragePercent: d.coveragePercent })));
          }
        } catch { /* coverage curve is optional */ }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run optimization. Is the solver running?');
      // Fall back to mock data for demo
      setResult({
        model,
        totalSelected: model === 'mclp' ? Math.min(budget, 57) : 57,
        coveragePercent: model === 'mclp' ? Math.min(100, Math.round((budget / 57) * 100)) : 100,
        solveTimeMs: 1200,
        selectedCells: [],
        coveredSpecies: Array(model === 'mclp' ? Math.round(220 * Math.min(1, budget / 57)) : 220).fill('').map((_, i) => `Species ${i + 1}`),
        uncoveredSpecies: model === 'mclp' ? Array(Math.max(0, 220 - Math.round(220 * Math.min(1, budget / 57)))).fill('').map((_, i) => `Species ${220 - i}`) : [],
        cellDetails: [],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-transition">
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Optimization</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Configure and run reserve selection models</p>
      </header>

      <div className="grid grid-cols-2" style={{ alignItems: 'start' }}>
        <div className="glass-card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Model Configuration</h2>

          <ModelToggle value={model} onChange={setModel} />

          {model === 'mclp' && (
            <div style={{ marginTop: '2rem', animation: 'fadeIn var(--transition-normal)' }}>
              <BudgetSlider value={budget} onChange={setBudget} />

              <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={weighted} onChange={e => setWeighted(e.target.checked)} id="iucn-toggle" />
                  <span style={{ fontSize: '0.9rem' }}>Use IUCN Weighting</span>
                </label>
              </div>
            </div>
          )}

          <div style={{ marginTop: '2.5rem' }}>
            <button
              id="run-optimization-btn"
              className="btn-primary"
              style={{ width: '100%', minHeight: '48px' }}
              onClick={runOptimization}
              disabled={loading}
            >
              {loading ? <LoadingSpinner text="Solving..." /> : 'Run Optimization'}
            </button>
          </div>

          {error && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(229, 83, 75, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(229, 83, 75, 0.3)', fontSize: '0.85rem', color: 'var(--accent-red)' }}>
              ⚠️ {error} — showing estimated results
            </div>
          )}
        </div>

        {result && (
          <div className="glass-card page-transition">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Results</h2>
              {result.cached && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '12px' }}>cached</span>}
            </div>

            <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reserves Selected</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent-primary)' }}>{result.totalSelected}</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Coverage</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent-primary)' }}>{result.coveragePercent}%</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Species Covered</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{result.coveredSpecies.length}</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Solve Time</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{(result.solveTimeMs / 1000).toFixed(1)}s</div>
              </div>
            </div>

            {result.cellDetails && result.cellDetails.length > 0 && (
              <>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Selected Cells</h3>
                <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                  <table className="data-table">
                    <thead><tr><th>Cell ID</th><th>Lat</th><th>Lon</th><th>Species</th></tr></thead>
                    <tbody>
                      {result.cellDetails.slice(0, 20).map((c) => (
                        <tr key={c.cellId}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.cellId}</td>
                          <td>{c.centroidLat.toFixed(2)}</td>
                          <td>{c.centroidLon.toFixed(2)}</td>
                          <td>{c.speciesCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {result.uncoveredSpecies.length > 0 && (
              <>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--accent-red)' }}>
                  Uncovered Species ({result.uncoveredSpecies.length})
                </h3>
                <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '1rem' }}>
                  {result.uncoveredSpecies.slice(0, 15).map((sp) => (
                    <div key={sp} style={{ fontStyle: 'italic', fontSize: '0.85rem', padding: '2px 0', color: 'var(--text-secondary)' }}>{sp}</div>
                  ))}
                  {result.uncoveredSpecies.length > 15 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>...and {result.uncoveredSpecies.length - 15} more</div>}
                </div>
              </>
            )}

            {coverageCurve.length > 0 && model === 'mclp' && (
              <>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', marginTop: '1rem' }}>Coverage Curve</h3>
                <CoverageChart data={coverageCurve} xKey="budget" yKey="coveragePercent" />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
