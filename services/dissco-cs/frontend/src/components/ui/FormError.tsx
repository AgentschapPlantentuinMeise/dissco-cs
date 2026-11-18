import React from 'react';

// Under a form: the server refused what was sent (wrong password, address already in use). The user
// has to change something and try again, so it stays on the form instead of a toast that fades.
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-danger-700 m-0">
      {children}
    </p>
  );
}
