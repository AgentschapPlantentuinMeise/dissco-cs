import { ProjectProgressDto } from '@dissco-cs/shared-types';
import type { QuarterCount } from '../../logic/honour-board.logic.js';
import type { InstitutionCounts, SiteTaskTotals } from '../../madoc-db/stats.repository.js';
import type { ProjectFormNames } from '../../services/forms.service.js';
import type { NavItemRow } from '../../repositories/nav-items.repository.js';
import type { SiteThemeRow } from '../../repositories/site-theme.repository.js';
import { SiteCache } from './site-cache.js';

// Every cache of the backend, with how long an entry stays fresh and why. Values are the same for
// every visitor of a site, except siteUserRole, which is per user (why: see its comment below). Each cache lives in this one process's
// memory: with several backend containers, a change would only reach the cache of the one that
// handled it. A ttlMs of 0 means: every read answers from the cache and starts a refresh.
//
// Not here: the site id per slug (madoc-client/site.ts). It only keeps slugs Madoc knows and never
// expires; a SwrCache would also keep the unknown ones, so random slugs would fill the memory.
export const caches = {
  // The numbers on a project card, computed from all of the project's tasks in Madoc. Refreshed in
  // the background after 30 s. Submitting a task and releasing one in review mark the site stale,
  // because those routes only know the task id, not its project.
  projectProgress: new SiteCache<ProjectProgressDto>('project-progress', { ttlMs: 30_000 }),

  // The form name and status of every project (key 'all'), from every page of Madoc's project list
  // plus its model list; public pages need it on every visit. A new project or a renamed model
  // shows up with up to a minute's delay.
  projectFormNames: new SiteCache<ProjectFormNames>('project-form-names', { ttlMs: 60_000 }),

  // The site's number of volunteers (key 'all'): changes slowly, so at most every 5 minutes.
  siteVolunteers: new SiteCache<number>('stats:site-volunteers', { ttlMs: 5 * 60 * 1000 }),
  // The site's completed and total tasks (key 'all').
  siteTaskTotals: new SiteCache<SiteTaskTotals>('stats:site-task-totals', { ttlMs: 0 }),
  // An institution's numbers (key: its id). Every institution card asks for them, so 30 s: with 0,
  // a visit to Institutions recalculated every institution (3-4 queries each) on every read.
  institutionStats: new SiteCache<InstitutionCounts>('stats:institution', { ttlMs: 30_000 }),

  // Tasks per volunteer in a quarter (key: the quarter, e.g. '2026-Q4'). A closed quarter only
  // changes when a reviewer rejects one of its tasks, so an hour is fresh enough.
  honourBoardRunning: new SiteCache<QuarterCount[]>('honour-board', { ttlMs: 0 }),
  honourBoardClosed: new SiteCache<QuarterCount[]>('honour-board-closed', { ttlMs: 60 * 60 * 1000 }),

  // Madoc's site title (key 'title'), shown in the navbar on every page. It is changed in Madoc's
  // site admin, which does not tell us, so a rename shows up within 5 minutes.
  siteTitle: new SiteCache<string | null>('site-title', { ttlMs: 5 * 60 * 1000 }),

  // A user's site role (key: the Madoc user id), asked for every review call. The one cache per
  // user, on purpose: a role changes rarely, and a removed reviewer keeps access for about a minute.
  siteUserRole: new SiteCache<string | null>('site-user-role', { ttlMs: 60_000 }),

  // Our own tables, only changed through our own admin routes: those writes clear the site's entry
  // (in the repository, after the write), so the admin who just saved sees the change at once.
  navItems: new SiteCache<NavItemRow[]>('nav-items', { untilChanged: true }),
  siteTheme: new SiteCache<SiteThemeRow | null>('site-theme', { untilChanged: true }),
};
