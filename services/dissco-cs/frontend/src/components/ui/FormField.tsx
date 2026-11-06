import React from 'react';

interface FormFieldProps {
  label: string;
  className?: string;
  children: React.ReactNode;
}

// A form field with its label above it.
export function FormField({ label, className = '', children }: FormFieldProps) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
