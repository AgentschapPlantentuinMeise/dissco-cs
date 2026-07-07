import React from 'react';
import { FieldProps } from './registry';

// Fase 1: a plain textarea editing raw HTML. A WYSIWYG toolbar is Fase 2 scope.
export function HtmlField({ field, path, onChange }: FieldProps) {
  return (
    <textarea
      className="w-full border border-gray-300 rounded px-2 py-1 text-[0.9rem] font-mono"
      rows={5}
      value={field.value ?? ''}
      onChange={e => onChange(path, e.target.value)}
    />
  );
}
