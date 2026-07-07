import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSitePages } from '../contexts/SitePagesContext';
import { SitePageKey } from '../api/cs-api';

export const PageGate: React.FC<{ pageKey: SitePageKey; children: React.ReactNode }> = ({ pageKey, children }) => {
  const { loading, isActive } = useSitePages();

  if (loading) {
    return null;
  }

  if (!isActive(pageKey)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};
