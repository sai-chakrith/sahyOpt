'use client';
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CoverageChartProps {
  data: any[];
  xKey?: string;
  yKey?: string;
}

export default function CoverageChart({ data, xKey = "budget", yKey = "coverage" }: CoverageChartProps) {
  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
          <XAxis dataKey={xKey} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}
            itemStyle={{ color: 'var(--accent-primary)' }}
          />
          <Line 
            type="monotone" 
            dataKey={yKey} 
            stroke="var(--accent-primary)" 
            strokeWidth={3}
            dot={{ r: 4, fill: 'var(--bg-primary)', stroke: 'var(--accent-primary)', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: 'var(--accent-primary)', stroke: 'var(--bg-primary)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
