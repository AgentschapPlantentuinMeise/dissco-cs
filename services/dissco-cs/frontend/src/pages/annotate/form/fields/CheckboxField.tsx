import React from 'react';
import { FieldProps } from './registry';

export function CheckboxField({ field, path, onChange }: FieldProps) {
  return (
    <input
      type="checkbox"
      checked={!!field.value}
      onChange={e => onChange(path, e.target.checked)}
      className="w-[18px] h-[18px]"
    />
  );
}
