import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { addBreadcrumb } from '../../api/breadcrumbs';
import { reportClientError } from '../../api/cs-client/client-errors';
import { PageError } from './PageError';
import { Button } from '../ui/Button';

// No Navbar on purpose: if the Navbar itself is what crashed, the fallback must not crash too.
function ErrorFallback() {
  const { t } = useTranslation('dissco-cs');
  return (
    <div className="cs-bootstrap-wrapper">
      <PageError title={t('error_boundary_title')} text={t('error_boundary_text')}>
        <Button onClick={() => window.location.reload()}>{t('error_boundary_reload')}</Button>
      </PageError>
    </div>
  );
}

// Starts over when resetKey changes. Not a React key: that would rebuild everything inside on every
// change, the layout's Suspense included, and show "Loading" on every navigation.
class ErrorBoundary extends React.Component<{ resetKey: string; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    reportClientError(error, 'render');
  }

  componentDidUpdate(previous: { resetKey: string }) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? <ErrorFallback /> : this.props.children;
  }
}

// Around a page, inside the layout: a crashing page keeps the navbar, so the user can go elsewhere.
// Resets per path, so navigating away from a crashed page works again.
export function PageErrorBoundary({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}

// Wraps the routes, layout included (a crash in the navbar itself lands here): records every page
// change as a breadcrumb, and resets per path so navigating away from a crashed page works again.
export function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  useEffect(() => {
    addBreadcrumb('route', pathname);
  }, [pathname]);

  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}
