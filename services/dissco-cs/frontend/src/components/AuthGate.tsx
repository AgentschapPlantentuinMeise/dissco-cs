import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useUser } from '../hooks/use-current-user';
import { reviewApi } from '../api/cs-api';

export const AuthGate: React.FC<{ requireAdmin?: boolean; requireReviewer?: boolean; children: React.ReactNode }> = ({
  requireAdmin,
  requireReviewer,
  children,
}) => {
  const user = useUser();
  const isAdmin = !!user && user.scope.includes('site.admin');

  // Zelfde query-key als Navbar's eigen is-reviewer-check, zodat react-query de call deelt
  // i.p.v. een tweede keer op te vragen.
  const { data: reviewerCheck, isLoading: reviewerLoading } = useQuery('nav-is-reviewer', () => reviewApi.isReviewer(), {
    enabled: !!requireReviewer && !!user && !isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  if (!user) {
    // useLocation().pathname excludes the router's basename (/s/{slug}), but Login's
    // redirectAfterLogin does a raw window.location.href navigation with this value -
    // it needs the basename included or the post-login redirect 404s.
    const redirect = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" />;
  }

  if (requireReviewer && !isAdmin) {
    if (reviewerLoading) return null;
    if (!reviewerCheck?.isReviewer) return <Navigate to="/" />;
  }

  return <>{children}</>;
};
