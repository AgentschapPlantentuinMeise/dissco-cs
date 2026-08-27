import React from 'react';
import { Select } from '../../../../components/Select';
import { FieldProps } from './registry';

type DropdownOption = { value: string; text: string; label?: string };

export function DropdownField({ field, path, onChange }: FieldProps) {
  const options: DropdownOption[] = (field as any).options ?? [];

  return (
    <Select
      className="w-full border border-gray-300 rounded px-2 py-1 text-[0.9rem]"
      value={field.value ?? ''}
      onChange={e => onChange(path, e.target.value)}
    >
      <option value="" disabled>
        Kies...
      </option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label ?? option.text}
        </option>
      ))}
    </Select>
  );
}
