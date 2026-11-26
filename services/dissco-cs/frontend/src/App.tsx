import { ComponentType, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { getSiteSlug } from './api/slug';
import { PageGate } from './components/layout/PageGate';
import { AuthGate } from './components/layout/AuthGate';
import { RouteErrorBoundary } from './components/layout/ErrorBoundary';
import { SiteLayout } from './components/layout/SiteLayout';
import { Homepage } from './pages/homepage/Homepage';
import { Projects } from './pages/projects/Projects';
import { ProjectDetail } from './pages/projects/ProjectDetail';
import { About } from './pages/about/About';
import { Help } from './pages/help/Help';
import { Institutions } from './pages/institutions/Institutions';
import { InstitutionDetail } from './pages/institutions/InstitutionDetail';
import { SearchResults } from './pages/search/SearchResults';
import { Contact } from './pages/contact/Contact';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { SetPassword } from './pages/auth/SetPassword';
import { NotFound } from './pages/not-found/NotFound';

// Pages most visitors never open (annotating, site management, review, their own dashboard and
// account, the forum) are loaded only when someone goes there, so a first visit to the homepage
// does not download the image viewer, the form editor and every management page. lazy() needs a
// default export; our pages are named exports, hence the helper.
function lazyNamed<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() => load().then(module => ({ default: module[name] })));
}

const AnnotatePage = lazyNamed(() => import('./pages/annotate/AnnotatePage'), 'AnnotatePage');
const UserDashboard = lazyNamed(() => import('./pages/user-dashboard/UserDashboard'), 'UserDashboard');
const MyAccount = lazyNamed(() => import('./pages/my-account/MyAccount'), 'MyAccount');
const Review = lazyNamed(() => import('./pages/review/Review'), 'Review');
const Forum = lazyNamed(() => import('./pages/forum/Forum'), 'Forum');
const SiteManagement = lazyNamed(() => import('./pages/site-management/SiteManagement'), 'SiteManagement');
const ProjectManagement = lazyNamed(() => import('./pages/site-management/project-management/ProjectManagement'), 'ProjectManagement');
const Announcements = lazyNamed(() => import('./pages/site-management/announcements/Announcements'), 'Announcements');
const PageManagement = lazyNamed(() => import('./pages/site-management/page-management/PageManagement'), 'PageManagement');
const InstitutionManagement = lazyNamed(() => import('./pages/site-management/institution-management/InstitutionManagement'), 'InstitutionManagement');
const FormManagement = lazyNamed(() => import('./pages/site-management/form-management/FormManagement'), 'FormManagement');
const ManualManagement = lazyNamed(() => import('./pages/site-management/manual-management/ManualManagement'), 'ManualManagement');
const SiteColors = lazyNamed(() => import('./pages/site-management/site-colors/SiteColors'), 'SiteColors');
const SiteImages = lazyNamed(() => import('./pages/site-management/site-images/SiteImages'), 'SiteImages');
const HomeSteps = lazyNamed(() => import('./pages/site-management/home-steps/HomeSteps'), 'HomeSteps');
const HonourBoardManagement = lazyNamed(() => import('./pages/site-management/honour-board/HonourBoardManagement'), 'HonourBoardManagement');

export function App() {
  const basename = `/s/${getSiteSlug()}`;

  return (
    <BrowserRouter basename={basename}>
      <RouteErrorBoundary>
        <Routes>
          <Route element={<SiteLayout />}>
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
            <Route path="/forum" element={<PageGate pageKey="forum"><AuthGate><Forum /></AuthGate></PageGate>} />
            <Route path="/contact" element={<PageGate pageKey="contact"><Contact /></PageGate>} />
            <Route path="/my-dashboard" element={<AuthGate><UserDashboard /></AuthGate>} />
            <Route path="/my-account" element={<AuthGate><MyAccount /></AuthGate>} />
            <Route path="/review" element={<AuthGate requireReviewer><Review /></AuthGate>} />
            <Route path="/manage" element={<AuthGate requireAdmin><SiteManagement /></AuthGate>} />
            <Route path="/manage/projects" element={<AuthGate requireAdmin><ProjectManagement /></AuthGate>} />
            <Route path="/manage/forms" element={<AuthGate requireAdmin><FormManagement /></AuthGate>} />
            <Route path="/manage/manuals" element={<AuthGate requireAdmin><ManualManagement /></AuthGate>} />
            <Route path="/manage/announcements" element={<AuthGate requireAdmin><Announcements /></AuthGate>} />
            <Route path="/manage/pages" element={<AuthGate requireAdmin><PageManagement /></AuthGate>} />
            <Route path="/manage/institutions" element={<AuthGate requireAdmin><InstitutionManagement /></AuthGate>} />
            <Route path="/manage/colors" element={<AuthGate requireAdmin><SiteColors /></AuthGate>} />
            <Route path="/manage/images" element={<AuthGate requireAdmin><SiteImages /></AuthGate>} />
            <Route path="/manage/home-steps" element={<AuthGate requireAdmin><HomeSteps /></AuthGate>} />
            <Route path="/manage/honour-board" element={<AuthGate requireAdmin><HonourBoardManagement /></AuthGate>} />
            <Route path="/find" element={<SearchResults />} />
            <Route path="/explore" element={<Projects />} />
            <Route path="/explore/:slug"element={<ProjectDetail />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route element={<SiteLayout fullScreen />}>
            <Route path="/explore/:slug/manifests/:manifestId/annotate" element={<AuthGate><AnnotatePage /></AuthGate>} />
          </Route>
        </Routes>
      </RouteErrorBoundary>
    </BrowserRouter>
  );
}
