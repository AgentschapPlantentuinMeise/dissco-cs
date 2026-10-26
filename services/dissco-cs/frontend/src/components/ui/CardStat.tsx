import React from 'react';

// A number with its label on the bottom line of a card, e.g. "6 lopende projecten".
export function CardStat({ value, label }: { value: React.ReactNode; label: React.ReactNode }) {
  return (
    <span>
      <b className="text-gray-700 tabular-nums">{value}</b> {label}
    </span>
  );
}
