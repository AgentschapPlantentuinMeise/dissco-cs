import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../hooks/use-current-user';

export const AuthGate: React.FC<{ requireAdmin?: boolean; children: React.ReactNode }> = ({ requireAdmin, children }) => {
  const user = useUser();
  const location = useLocation();

  if (!user) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (requireAdmin && !user.scope.includes('site.admin')) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};
