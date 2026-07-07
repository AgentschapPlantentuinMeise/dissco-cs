import React from 'react';
import { Navbar } from './navbar/Navbar';

export function CsPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="cs-bootstrap-wrapper">
      <Navbar />
      {children}
    </div>
  );
}
