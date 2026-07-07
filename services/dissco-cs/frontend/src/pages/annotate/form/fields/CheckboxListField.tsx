import React from 'react';
import { FieldProps } from './registry';

type CheckboxOption = { value: string; label: string; description?: string };

export function CheckboxListField({ field, path, onChange }: FieldProps) {
  const options: CheckboxOption[] = (field as any).options ?? [];
  const value: Record<string, boolean> = field.value ?? {};

  return (
    <fieldset className="border border-gray-200 rounded divide-y divide-gray-200">
      {options.map(option => (
        <label key={option.value} className="flex items-start gap-2 px-2 py-2 text-[0.9rem] cursor-pointer">
          <input
            type="checkbox"
            className="mt-[2px] w-[16px] h-[16px]"
            checked={!!value[option.value]}
            onChange={e => onChange(path, { ...value, [option.value]: e.target.checked })}
          />
          <span>
            {option.label}
            {option.description && <span className="block text-[0.78rem] text-gray-500">{option.description}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
