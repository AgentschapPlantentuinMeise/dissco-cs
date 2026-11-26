import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { SiteFooter } from './SiteFooter';
import { LoadingText } from './LoadingText';
import { PageErrorBoundary } from './ErrorBoundary';
import { AnnouncementStrip } from '../announcements/AnnouncementStrip';

// The frame around every page, set once on the routes in App.tsx: a page draws only its own
// content. So the navbar stays while a lazily loaded page's code arrives (Suspense) and when a page
// crashes (PageErrorBoundary); only the middle changes.
// fullScreen for a working screen that fills exactly the viewport below the navbar (the annotate
// page): an announcement strip or a footer there would add a page-level scrollbar on top of the
// panel's own. Announcements stay available under the megaphone in the navbar.
export function SiteLayout({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div className="cs-bootstrap-wrapper flex flex-col">
      <Navbar />
      {!fullScreen && <AnnouncementStrip />}
      {/* Grows to fill a short page, so the footer stays at the bottom of the screen. */}
      <div className="flex-1">
        <PageErrorBoundary>
          <Suspense fallback={<LoadingText />}>
            <Outlet />
          </Suspense>
        </PageErrorBoundary>
      </div>
      {!fullScreen && <SiteFooter />}
    </div>
  );
}
