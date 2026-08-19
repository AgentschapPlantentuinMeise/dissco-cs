import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { getSiteSlug } from './api/slug';
import { disscoCSConfig } from './dissco-cs-config';
import { SitePagesProvider } from './contexts/SitePagesContext';
import { PageGate } from './components/PageGate';
import { AuthGate } from './components/AuthGate';
import { Homepage } from './pages/homepage/Homepage';
import { Projects } from './pages/projects/Projects';
import { ProjectDetail } from './pages/project-detail/ProjectDetail';
import { AnnotatePage } from './pages/annotate/AnnotatePage';
import { About } from './pages/about/About';
import { Help } from './pages/help/Help';
import { Institutions } from './pages/institutions/Institutions';
import { InstitutionDetail } from './pages/institutions/InstitutionDetail';
import { HonourBoard } from './pages/honour-board/HonourBoard';
import { SearchResults } from './pages/search/SearchResults';
import { Contact } from './pages/contact/Contact';
import { UserDashboard } from './pages/user-dashboard/UserDashboard';
import { Dashboard } from './pages/dashboard/Dashboard';
import { ReviewTasks } from './pages/review/ReviewTasks';
import { MessageBoard } from './pages/message-board/MessageBoard';
import { SiteManagement } from './pages/site-management/SiteManagement';
import { ProjectManagement } from './pages/site-management/ProjectManagement';
import { Announcements } from './pages/site-management/Announcements';
import { UserManagement } from './pages/site-management/UserManagement';
import { PageManagement } from './pages/site-management/PageManagement';
import { InstitutionManagement } from './pages/site-management/InstitutionManagement';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { SetPassword } from './pages/auth/SetPassword';



export const App: React.FC = () => {
  const basename = `/s/${getSiteSlug()}`;

  return (
    <BrowserRouter basename={basename}>
      <SitePagesProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/reset-password" element={<SetPassword />} />
          <Route path="/activate-account" element={<SetPassword />} />
          <Route path="/" element={<Homepage />} />
          <Route path="/about" element={<PageGate pageKey="about"><About /></PageGate>} />
          <Route path="/help" element={<PageGate pageKey="help"><Help /></PageGate>} />
          <Route path="/institutions" element={<PageGate pageKey="institutions"><Institutions /></PageGate>} />
          <Route path="/institutions/:slug" element={<PageGate pageKey="institutions"><InstitutionDetail /></PageGate>} />
          <Route path="/honour-board" element={<HonourBoard />} />
          <Route path="/messageboard" element={<PageGate pageKey="forum"><AuthGate><MessageBoard /></AuthGate></PageGate>} />
          <Route path="/contact" element={<PageGate pageKey="contact"><Contact /></PageGate>} />
          <Route path="/my-tasks" element={<AuthGate><UserDashboard /></AuthGate>} />
          <Route path="/my-dashboard" element={<AuthGate><Dashboard /></AuthGate>} />
          <Route path="/review" element={<AuthGate requireReviewer><ReviewTasks /></AuthGate>} />
          <Route path="/manage" element={<AuthGate requireAdmin><SiteManagement /></AuthGate>} />
          <Route path="/manage/projects" element={<AuthGate requireAdmin><ProjectManagement /></AuthGate>} />
          <Route path="/manage/announcements" element={<AuthGate requireAdmin><Announcements /></AuthGate>} />
          <Route path="/manage/users" element={<AuthGate requireAdmin><UserManagement /></AuthGate>} />
          <Route path="/manage/pages" element={<AuthGate requireAdmin><PageManagement /></AuthGate>} />
          <Route path="/manage/institutions" element={<AuthGate requireAdmin><InstitutionManagement /></AuthGate>} />
          <Route path="/find" element={<SearchResults />} />
          <Route path="/explore" element={<Projects />} />
          <Route path="/explore/:slug"element={<ProjectDetail />} />
          <Route path="/explore/:slug/manifests/:manifestId/annotate" element={<AuthGate><AnnotatePage /></AuthGate>} />
        </Routes>
      </SitePagesProvider>
    </BrowserRouter>
  );
};
