'use client';
import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ModelToggle from '@/components/ModelToggle';
import BudgetSlider from '@/components/BudgetSlider';
import LoadingSpinner from '@/components/LoadingSpinner';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

interface CellData {
  id: string;
  bounds: [[number, number], [number, number]];
  speciesCount: number;
  selected: boolean;
  species?: string[];
}

export default function MapPage() {
  const [model, setModel] = useState<'set_covering' | 'mclp'>('set_covering');
  const [budget, setBudget] = useState(20);
  const [weighted, setWeighted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cells, setCells] = useState<CellData[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [resultSummary, setResultSummary] = useState<any>(null);
  const [cellsLoaded, setCellsLoaded] = useState(false);

  // Load grid cells on mount
  useEffect(() => {
    async function loadCells() {
      try {
        const res = await fetch('/api/cells');
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map((c: any) => ({
            id: c.id,
            bounds: [
              [c.cellLat, c.cellLon],
              [c.cellLat + 0.1, c.cellLon + 0.1],
            ] as [[number, number], [number, number]],
            speciesCount: c.speciesCount || 0,
            selected: false,
          }));
          setCells(mapped);
          setCellsLoaded(true);
        }
      } catch {
        console.log('Cells API not available');
      }
    }
    loadCells();
  }, []);

  const runOptimization = useCallback(async () => {
    setLoading(true);
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
      if (res.ok) {
        const data = await res.json();
        setSelectedIds(data.selectedCells || []);
        setResultSummary({
          totalSelected: data.totalSelected,
          coveragePercent: data.coveragePercent,
          coveredCount: data.coveredSpecies?.length || 0,
          solveTimeMs: data.solveTimeMs,
        });
      }
    } catch {
      console.log('Optimization failed');
    } finally {
      setLoading(false);
    }
  }, [model, budget, weighted]);

  return (
    <div className="page-transition" style={{ height: 'calc(100vh - 4rem)', display: 'flex', gap: '1.5rem' }}>
      <div className="glass-card" style={{ width: '340px', display: 'flex', flexDirection: 'column', gap: '1.5rem', flexShrink: 0, overflowY: 'auto' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Map Explorer</h2>

        <ModelToggle value={model} onChange={setModel} />

        {model === 'mclp' && (
          <div style={{ animation: 'fadeIn var(--transition-normal)' }}>
            <BudgetSlider value={budget} onChange={setBudget} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1rem', fontSize: '0.9rem' }}>
              <input type="checkbox" checked={weighted} onChange={e => setWeighted(e.target.checked)} />
              IUCN Weighting
            </label>
          </div>
        )}

        <button id="map-run-btn" className="btn-primary" style={{ width: '100%', minHeight: '44px' }} onClick={runOptimization} disabled={loading}>
          {loading ? <LoadingSpinner text="Solving..." /> : 'Run & Visualize'}
        </button>

        {resultSummary && (
          <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', animation: 'fadeIn var(--transition-normal)' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Result</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reserves</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--accent-primary)' }}>{resultSummary.totalSelected}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Coverage</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--accent-primary)' }}>{resultSummary.coveragePercent}%</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Species</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{resultSummary.coveredCount}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Time</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{(resultSummary.solveTimeMs / 1000).toFixed(1)}s</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 'auto' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Legend</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '16px', height: '16px', backgroundColor: '#2dd48c', opacity: 0.6, border: '2px solid #2dd48c' }}></div>
            <span style={{ fontSize: '0.85rem' }}>Selected Reserve</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '16px', height: '16px', backgroundColor: '#14705a', opacity: 0.3, border: '1px solid rgba(20, 112, 90, 0.5)' }}></div>
            <span style={{ fontSize: '0.85rem' }}>Grid Cell (density)</span>
          </div>
          {cellsLoaded && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>{cells.length} cells loaded from database</div>}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <MapView cells={cells.length > 0 ? cells : undefined} selectedCellIds={selectedIds} />
      </div>
    </div>
  );
}
