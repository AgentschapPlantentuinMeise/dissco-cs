import React from 'react';

interface FormFieldProps {
  /** Left out only where the field names itself (a reply box with aria-label and placeholder). */
  label?: string;
  className?: string;
  /** The translated message when the field is not valid; the field itself sets aria-invalid for the red border. */
  error?: string;
  children: React.ReactNode;
}

// A form field with its label above it, and its error below it.
export function FormField({ label, className = '', error, children }: FormFieldProps) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
      {children}
      {error && <FieldErrorText>{error}</FieldErrorText>}
    </label>
  );
}

// The error under a field, for the few fields that cannot sit in a FormField (a file button is a
// label itself, and a label cannot hold another one).
export function FieldErrorText({ children }: { children: React.ReactNode }) {
  return (
    <span role="alert" className="text-sm text-danger-700">
      {children}
    </span>
  );
}
