'use client';
import React from 'react';

interface IUCNBadgeProps {
  category: 'CR' | 'EN' | 'VU' | 'NT' | 'LC' | 'DD' | 'NE' | string;
}

export default function IUCNBadge({ category }: IUCNBadgeProps) {
  const catLower = (category || 'NE').toLowerCase();
  const validCategories = ['cr', 'en', 'vu', 'nt', 'lc', 'dd'];
  const badgeClass = validCategories.includes(catLower) ? `badge-${catLower}` : 'badge-dd';
  
  return (
    <span className={`badge ${badgeClass}`}>
      {category || 'NE'}
    </span>
  );
}
