import React from 'react';
import { FieldProps } from './registry';

export function TextField({ field, path, onChange }: FieldProps) {
  const multiline = !!(field as any).multiline;
  const inputClass = 'w-full border border-gray-300 rounded px-2 py-1 text-[0.9rem]';

  if (multiline) {
    return (
      <textarea
        className={inputClass}
        rows={4}
        value={field.value ?? ''}
        onChange={e => onChange(path, e.target.value)}
      />
    );
  }

  return (
    <input
      type="text"
      className={inputClass}
      value={field.value ?? ''}
      onChange={e => onChange(path, e.target.value)}
    />
  );
}
