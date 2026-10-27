import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { reviewQueries } from '../../api/queries/review';
import { currentLocation, withQuery } from '../../api/url';
import { useCurrentUser } from '../../hooks/use-current-user';
import { NoAccessRedirect } from './NoAccessRedirect';
import { PageLoadError } from './PageLoadError';
import { failedToLoad } from '../../api/query-state';

export function AuthGate({
  requireAdmin,
  requireReviewer,
  children,
}: { requireAdmin?: boolean; requireReviewer?: boolean; children: React.ReactNode }) {
  const user = useCurrentUser();
  const isAdmin = !!user && user.scope.includes('site.admin');

  // Same query key as UserMenu's reviewer check, so react-query shares the call instead of
  // fetching it twice.
  const reviewerQuery = useQuery({
    ...reviewQueries.isReviewer(),
    enabled: !!requireReviewer && !!user && !isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  if (!user) {
    // useLocation().pathname excludes the router's basename (/s/{slug}), but Login's
    // redirectAfterLogin does a raw window.location.href navigation with this value -
    // it needs the basename included or the post-login redirect 404s.
    return <Navigate to={withQuery('/login', { redirect: currentLocation() })} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <NoAccessRedirect />;
  }

  if (requireReviewer && !isAdmin) {
    // A failed check is not "no access". Checked before loading: the error page's own Navbar runs
    // the same check again, and the retry must not swap the error page for an empty screen.
    if (failedToLoad(reviewerQuery)) return <PageLoadError />;
    if (reviewerQuery.isLoading) return null;
    if (!reviewerQuery.data) return <NoAccessRedirect />;
  }

  return <>{children}</>;
}
