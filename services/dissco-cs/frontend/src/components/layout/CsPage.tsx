import React from 'react';
import { Navbar } from './Navbar';
import { SiteFooter } from './SiteFooter';
import { AnnouncementStrip } from '../announcements/AnnouncementStrip';

// fullScreen for a working screen that fills exactly the viewport below the navbar (the annotate
// page): an announcement strip or a footer there would add a page-level scrollbar on top of the
// panel's own. Announcements stay available under the megaphone in the navbar.
export function CsPage({ children, fullScreen = false }: { children: React.ReactNode; fullScreen?: boolean }) {
  return (
    <div className="cs-bootstrap-wrapper flex flex-col">
      <Navbar />
      {!fullScreen && <AnnouncementStrip />}
      {/* Grows to fill a short page, so the footer stays at the bottom of the screen. */}
      <div className="flex-1">{children}</div>
      {!fullScreen && <SiteFooter />}
    </div>
  );
}
