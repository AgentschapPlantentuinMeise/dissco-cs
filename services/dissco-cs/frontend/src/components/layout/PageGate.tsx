import React from 'react';
import { Navigate } from 'react-router-dom';
import { useNavItems } from '../../hooks/use-nav-items';
import { NavItemKey } from '@dissco-cs/shared-types';

export function PageGate({ pageKey, children }: { pageKey: NavItemKey; children: React.ReactNode }) {
  const { loading, isActive } = useNavItems();

  if (loading) {
    return null;
  }

  if (!isActive(pageKey)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}
