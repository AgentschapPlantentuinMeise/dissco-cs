import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { addBreadcrumb } from '../../api/breadcrumbs';
import { reportClientError } from '../../api/cs-client/client-errors';
import { PageError, pageErrorPrimaryButton } from './PageError';

// No Navbar on purpose: if the Navbar itself is what crashed, the fallback must not crash too.
function ErrorFallback() {
  const { t } = useTranslation('dissco-cs');
  return (
    <div className="cs-bootstrap-wrapper">
      <PageError title={t('error_boundary_title')} text={t('error_boundary_text')}>
        <button type="button" onClick={() => window.location.reload()} className={pageErrorPrimaryButton}>
          {t('error_boundary_reload')}
        </button>
      </PageError>
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    reportClientError(error, 'render');
  }

  render() {
    return this.state.failed ? <ErrorFallback /> : this.props.children;
  }
}

// Wraps the routes: records every page change as a breadcrumb, and starts a fresh boundary per
// path so navigating away from a crashed page works again.
export function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  useEffect(() => {
    addBreadcrumb('route', pathname);
  }, [pathname]);

  return <ErrorBoundary key={pathname}>{children}</ErrorBoundary>;
}
