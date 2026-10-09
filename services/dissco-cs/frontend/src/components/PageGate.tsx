import React from 'react';
import { Navigate } from 'react-router-dom';
import { useNavItems } from '../hooks/use-nav-items';
import { NavItemKey } from '@dissco-cs/shared-types';

export const PageGate: React.FC<{ pageKey: NavItemKey; children: React.ReactNode }> = ({ pageKey, children }) => {
  const { loading, isActive } = useNavItems();

  if (loading) {
    return null;
  }

  if (!isActive(pageKey)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};
