import { serve } from '@hono/node-server';

import { appConfig } from './config.js';
import { DisscoCSRepository } from './db.js';
import { HonourBoardRepository } from './repositories/honour-board.repository.js';
import { MadocUsersRepository } from './repositories/madoc-users.repository.js';
import { SiteTaskTotalsRepository } from './repositories/site-task-totals.repository.js';
import { createDisscoCSApp } from './app.js';

export async function bootstrap(): Promise<void> {
  const repository = new DisscoCSRepository();
  const honourBoardRepository = new HonourBoardRepository();
  const madocUsersRepository = new MadocUsersRepository();
  const siteTaskTotalsRepository = new SiteTaskTotalsRepository();
  const app = createDisscoCSApp(repository, honourBoardRepository, madocUsersRepository, siteTaskTotalsRepository);

  try {
    await repository.waitUntilReady(appConfig.startupRetryCount, appConfig.startupRetryMs);

    if (appConfig.migrate) {
      await repository.migrate();
    }

    serve(
      {
        fetch: app.fetch,
        hostname: appConfig.host,
        port: appConfig.port,
      },
      info => {
        console.log(`DiSSCo CS API listening on http://${info.address}:${info.port}`);
      }
    );

    const shutdown = async () => {
      await repository.close();
      await honourBoardRepository.close();
      await madocUsersRepository.close();
      await siteTaskTotalsRepository.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('DiSSCo CS API failed to start', error);
    await repository.close();
    await honourBoardRepository.close();
    await madocUsersRepository.close();
    await siteTaskTotalsRepository.close();
    process.exit(1);
  }
}

void bootstrap();
