import { existsSync, readFileSync } from 'node:fs';

import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

import { DisscoCSRepository } from './db.js';
import { HonourBoardRepository } from './madoc-db/honour-board.repository.js';
import { StatsRepository } from './madoc-db/stats.repository.js';
import { announcementsController } from './controllers/announcements.controller.js';
import { contactController } from './controllers/contact.controller.js';
import { captureModelsController } from './controllers/capture-models.controller.js';
import { forumController } from './controllers/forum.controller.js';
import { iiifController } from './controllers/iiif.controller.js';
import { institutionsController } from './controllers/institutions.controller.js';
import { manualsController } from './controllers/manuals.controller.js';
import { projectsController } from './controllers/projects.controller.js';
import { feedbackController } from './controllers/feedback.controller.js';
import { reviewController } from './controllers/review.controller.js';
import { navItemsController } from './controllers/nav-items.controller.js';
import { statsController } from './controllers/stats.controller.js';
import { tasksController } from './controllers/tasks.controller.js';

export function createDisscoCSApp(
  repository: DisscoCSRepository,
  statsRepository: StatsRepository,
  honourBoardRepository: HonourBoardRepository
): Hono {
  const app = new Hono();

  app.get('/api/dissco-cs/health', c => c.text('ok'));
  app.route('/api/dissco-cs/forum', forumController(repository));
  app.route('/api/dissco-cs/nav-items', navItemsController(repository));
  app.route('/api/dissco-cs/contact', contactController(repository));
  app.route('/api/dissco-cs/announcements', announcementsController(repository));
  app.route('/api/dissco-cs/institutions', institutionsController(repository));
  app.route('/api/dissco-cs/stats', statsController(repository, statsRepository, honourBoardRepository));
  app.route('/api/dissco-cs/projects', projectsController(repository));
  app.route('/api/dissco-cs/tasks', tasksController());
  app.route('/api/dissco-cs/iiif', iiifController());
  app.route('/api/dissco-cs/capture-models', captureModelsController());
  app.route('/api/dissco-cs/manuals', manualsController(repository));
  app.route('/api/dissco-cs/review', reviewController());
  app.route('/api/dissco-cs/feedback', feedbackController(repository));

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
