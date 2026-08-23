'use client';

import React, { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import IUCNBadge from '@/components/IUCNBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const IUCN_COLORS: Record<string, string> = {
  CR: '#e5534b', EN: '#e8833a', VU: '#d4a72c', NT: '#3b82f6',
  LC: '#2dd48c', DD: '#8ba89a', NE: '#5a7a6a', NF: '#5a7a6a',
};

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, statusRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/data/status'),
        ]);

        if (statsRes.ok && statusRes.ok) {
          const stats = await statsRes.json();
          const status = await statusRes.json();

          setData({
            stats: {
              species: status.speciesCount,
              cells: status.cellCount,
              records: status.recordCount,
              minReserves: 57,
            },
            richness: (stats.richness || []).slice(0, 15).map((r: any) => ({
              cell: r.cellId?.substring(0, 10) || r.cellId,
              count: r.speciesCount,
            })),
            iucn: (stats.threatBreakdown || []).map((t: any) => ({
              name: t.category || 'NE',
              value: t.count,
              color: IUCN_COLORS[t.category] || '#5a7a6a',
            })),
            endemic: (stats.endemicSpecies || []).slice(0, 20).map((e: any) => ({
              name: e.name,
              cells: 1,
              iucn: e.iucnCategory || 'NE',
            })),
          });
          return;
        } else {
          throw new Error('Failed to load data — is the database seeded?');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load data — is the database seeded?');
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="page-transition" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading dashboard...</div>;
  }

  if (error || !data) {
    return (
      <div className="page-transition" style={{ padding: '2rem' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Western Ghats Amphibian Reserve Selection</p>
        </header>
        <div style={{ padding: '1.5rem', background: 'rgba(229, 83, 75, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(229, 83, 75, 0.3)', color: 'var(--accent-red)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>⚠️ Data Loading Error</h2>
          <p>{error || 'Failed to load data — is the database seeded?'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition">
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Overview</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Western Ghats Amphibian Reserve Selection</p>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <StatCard title="Total Species" value={data.stats.species} />
        <StatCard title="Grid Cells" value={data.stats.cells} />
        <StatCard title="Cleaned Records" value={data.stats.records} />
        <StatCard title="Min Reserves" value={data.stats.minReserves} />
      </div>

      <div className="grid grid-cols-2" style={{ marginBottom: '2rem' }}>
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Species Richness — Top Cells</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data.richness} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" stroke="var(--text-muted)" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis dataKey="cell" type="category" stroke="var(--text-muted)" axisLine={false} tickLine={false} width={85} fontSize={10} />
                <Tooltip cursor={{ fill: 'rgba(45, 212, 140, 0.05)' }} contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="var(--accent-primary)" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>IUCN Threat Breakdown</h3>
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.iucn} innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={{ stroke: 'var(--text-muted)' }}>
                  {data.iucn.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Endemic &amp; Highly Restricted Species (≤2 Cells)</h3>
        {data.endemic.length > 0 ? (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Species</th>
                  <th>IUCN Status</th>
                </tr>
              </thead>
              <tbody>
                {data.endemic.map((s: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontStyle: 'italic' }}>{s.name}</td>
                    <td><IUCNBadge category={s.iucn} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>No endemic species data available yet. Run IUCN weight fetching first.</p>
        )}
      </div>
    </div>
  );
}
