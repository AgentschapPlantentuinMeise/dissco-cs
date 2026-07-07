import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { getSiteSlug } from './api/slug';
import { disscoCSConfig } from './dissco-cs-config';
import { SitePagesProvider } from './contexts/SitePagesContext';
import { PageGate } from './components/PageGate';
import { Homepage } from './pages/homepage/Homepage';
import { Projects } from './pages/projects/Projects';
import { ProjectDetail } from './pages/project-detail/ProjectDetail';
import { AnnotatePage } from './pages/annotate/AnnotatePage';
import { About } from './pages/about/About';
import { Help } from './pages/help/Help';
import { Institutions } from './pages/institutions/Institutions';
import { InstitutionDetail } from './pages/institutions/InstitutionDetail';
import { Contact } from './pages/contact/Contact';
import { UserDashboard } from './pages/user-dashboard/UserDashboard';
import { MessageBoard } from './pages/message-board/MessageBoard';
import { SiteManagement } from './pages/site-management/SiteManagement';
import { ProjectManagement } from './pages/site-management/ProjectManagement';
import { Announcements } from './pages/site-management/Announcements';
import { UserManagement } from './pages/site-management/UserManagement';
import { PageManagement } from './pages/site-management/PageManagement';
import { InstitutionManagement } from './pages/site-management/InstitutionManagement';

const slug = disscoCSConfig.collectiesSlug;

export const App: React.FC = () => {
  const basename = `/s/${getSiteSlug()}`;

  return (
    <BrowserRouter basename={basename}>
      <SitePagesProvider>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/about" element={<PageGate pageKey="about"><About /></PageGate>} />
          <Route path="/help" element={<PageGate pageKey="help"><Help /></PageGate>} />
          <Route path="/institutions" element={<PageGate pageKey="institutions"><Institutions /></PageGate>} />
          <Route path="/institutions/:slug" element={<PageGate pageKey="institutions"><InstitutionDetail /></PageGate>} />
          <Route path="/messageboard" element={<PageGate pageKey="forum"><MessageBoard /></PageGate>} />
          <Route path="/contact" element={<PageGate pageKey="contact"><Contact /></PageGate>} />
          <Route path="/my-tasks" element={<UserDashboard />} />
          <Route path="/beheer" element={<SiteManagement />} />
          <Route path="/beheer/projecten" element={<ProjectManagement />} />
          <Route path="/beheer/meldingen" element={<Announcements />} />
          <Route path="/beheer/gebruikers" element={<UserManagement />} />
          <Route path="/beheer/paginas" element={<PageManagement />} />
          <Route path="/beheer/instituten" element={<InstitutionManagement />} />
          <Route path={`/${slug}`} element={<Projects />} />
          <Route path={`/${slug}/:slug`} element={<ProjectDetail />} />
          <Route path={`/${slug}/:slug/manifests/:manifestId/annotate`} element={<AnnotatePage />} />
        </Routes>
      </SitePagesProvider>
    </BrowserRouter>
  );
};
