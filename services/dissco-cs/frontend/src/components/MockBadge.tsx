import React from 'react';

export const MockBadge: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-block text-[0.65rem] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
    {label}
  </span>
);
