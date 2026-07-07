import React from 'react';
import { FieldProps } from './registry';

export function DateField({ field, path, onChange }: FieldProps) {
  return (
    <input
      type="date"
      className="border border-gray-300 rounded px-2 py-1 text-[0.9rem]"
      value={field.value ?? ''}
      onChange={e => onChange(path, e.target.value)}
    />
  );
}
