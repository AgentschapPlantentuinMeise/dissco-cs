import { existsSync, readFileSync } from 'node:fs';

import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

import { DisscoCSRepository } from './db.js';
import { HonourBoardRepository } from './repositories/honour-board.repository.js';
import { MadocUsersRepository } from './repositories/madoc-users.repository.js';
import { announcementsRoutes } from './routes/announcements.routes.js';
import { contactRoutes } from './routes/contact.routes.js';
import { forumRoutes } from './routes/forum.routes.js';
import { honourBoardRoutes } from './routes/honour-board.routes.js';
import { InstitutionStatsRepository } from './repositories/institution-stats.repository.js';
import { institutionsRoutes } from './routes/institutions.routes.js';
import { manifestClaimRoutes } from './routes/manifest-claim.routes.js';
import { projectDebugRoutes } from './routes/project-debug.routes.js';
import { projectManualsRoutes } from './routes/project-manuals.routes.js';
import { projectProgressRoutes } from './routes/project-progress.routes.js';
import { reviewFeedbackRoutes } from './routes/review-feedback.routes.js';
import { reviewRoutes } from './routes/review.routes.js';
import { sitePagesRoutes } from './routes/site-pages.routes.js';
import { statsRoutes } from './routes/stats.routes.js';
import { stuckTasksRoutes } from './routes/stuck-tasks.routes.js';
import { SiteTaskTotalsRepository } from './repositories/site-task-totals.repository.js';

export function createDisscoCSApp(
  repository: DisscoCSRepository,
  honourBoardRepository: HonourBoardRepository,
  madocUsersRepository: MadocUsersRepository,
  siteTaskTotalsRepository: SiteTaskTotalsRepository,
  institutionStatsRepository: InstitutionStatsRepository
): Hono {
  const app = new Hono();

  app.get('/api/dissco-cs/health', c => c.text('ok'));
  app.route('/api/dissco-cs/forum', forumRoutes(repository));
  app.route('/api/dissco-cs/site-pages', sitePagesRoutes(repository));
  app.route('/api/dissco-cs/contact', contactRoutes(repository));
  app.route('/api/dissco-cs/announcements', announcementsRoutes(repository));
  app.route('/api/dissco-cs/institutions', institutionsRoutes(repository, institutionStatsRepository, honourBoardRepository));
  app.route('/api/dissco-cs/stats', statsRoutes(madocUsersRepository, siteTaskTotalsRepository));
  app.route('/api/dissco-cs/honour-board', honourBoardRoutes(honourBoardRepository));
  app.route('/api/dissco-cs/projects', projectProgressRoutes());
  app.route('/api/dissco-cs/projects', manifestClaimRoutes());
  app.route('/api/dissco-cs/projects', stuckTasksRoutes());
  app.route('/api/dissco-cs/projects', projectDebugRoutes());
  app.route('/api/dissco-cs/review', reviewRoutes());
  app.route('/api/dissco-cs/review-feedback', reviewFeedbackRoutes(repository));
  app.route('/api/dissco-cs', projectManualsRoutes(repository));

  // Frontend static serving — only active in Docker where frontend-dist is bundled in.
  if (existsSync('./frontend-dist/index.html')) {
    const indexHtml = readFileSync('./frontend-dist/index.html', 'utf-8');

    app.use('/cs-assets/*', serveStatic({
      root: './frontend-dist',
      rewriteRequestPath: path => path.replace('/cs-assets', ''),
    }));

    app.get('/s/*', c => c.html(indexHtml));
  }

  return app;
}
