'use client';

import React, { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import IUCNBadge from '@/components/IUCNBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const IUCN_COLORS: Record<string, string> = {
  CR: '#e5534b', EN: '#e8833a', VU: '#d4a72c', NT: '#3b82f6',
  LC: '#2dd48c', DD: '#8ba89a', NE: '#5a7a6a', NF: '#5a7a6a',
};

const MOCK_DATA = {
  stats: { species: 220, cells: 759, records: 9226, minReserves: 57 },
  richness: [
    { cell: '10.1_76.6', count: 45 }, { cell: '11.2_76.3', count: 38 },
    { cell: '12.3_75.7', count: 34 }, { cell: '10.5_76.2', count: 31 },
    { cell: '9.8_77.0', count: 29 }, { cell: '11.8_76.0', count: 27 },
    { cell: '13.0_75.2', count: 25 }, { cell: '8.7_77.2', count: 23 },
    { cell: '14.5_74.5', count: 21 }, { cell: '10.9_76.1', count: 20 },
  ],
  iucn: [
    { name: 'LC', value: 95, color: '#2dd48c' }, { name: 'DD', value: 42, color: '#8ba89a' },
    { name: 'VU', value: 28, color: '#d4a72c' }, { name: 'EN', value: 25, color: '#e8833a' },
    { name: 'NT', value: 18, color: '#3b82f6' }, { name: 'CR', value: 8, color: '#e5534b' },
    { name: 'NE', value: 4, color: '#5a7a6a' },
  ],
  endemic: [
    { name: 'Nasikabatrachus sahyadrensis', cells: 1, iucn: 'EN' },
    { name: 'Raorchestes resplendens', cells: 1, iucn: 'CR' },
    { name: 'Micrixalus uttaraghati', cells: 2, iucn: 'DD' },
    { name: 'Nyctibatrachus jog', cells: 1, iucn: 'EN' },
    { name: 'Beddomixalus bijui', cells: 2, iucn: 'EN' },
  ],
};

export default function Dashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
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
              species: status.speciesCount || 220,
              cells: status.cellCount || 759,
              records: status.recordCount || 9226,
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
        }
      } catch (err) {
        console.log('API not available, using mock data');
      }
      // Fallback to mock
      setData(MOCK_DATA);
    }
    loadData();
  }, []);

  if (!data) return <div className="page-transition" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading dashboard...</div>;

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
