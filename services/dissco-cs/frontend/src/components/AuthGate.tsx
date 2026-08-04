import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../hooks/use-current-user';

export const AuthGate: React.FC<{ requireAdmin?: boolean; children: React.ReactNode }> = ({ requireAdmin, children }) => {
  const user = useUser();

  if (!user) {
    // useLocation().pathname excludes the router's basename (/s/{slug}), but Login's
    // redirectAfterLogin does a raw window.location.href navigation with this value -
    // it needs the basename included or the post-login redirect 404s.
    const redirect = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (requireAdmin && !user.scope.includes('site.admin')) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};
