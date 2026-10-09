import { serve } from '@hono/node-server';

import { appConfig } from './config.js';
import { DisscoCSDatabase } from './database/database.js';
import { HonourBoardRepository } from './madoc-db/honour-board.repository.js';
import { MadocDbPools } from './madoc-db/pools.js';
import { StatsRepository } from './madoc-db/stats.repository.js';
import { createDisscoCSApp } from './app.js';

export async function bootstrap(): Promise<void> {
  const database = new DisscoCSDatabase();
  const madocDbPools = new MadocDbPools();
  const app = createDisscoCSApp(database, new StatsRepository(madocDbPools), new HonourBoardRepository(madocDbPools));

  try {
    await database.waitUntilReady(appConfig.startupRetryCount, appConfig.startupRetryMs);

    if (appConfig.migrate) {
      await database.migrate();
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
      await database.close();
      await madocDbPools.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('DiSSCo CS API failed to start', error);
    await database.close();
    await madocDbPools.close();
    process.exit(1);
  }
}

void bootstrap();
