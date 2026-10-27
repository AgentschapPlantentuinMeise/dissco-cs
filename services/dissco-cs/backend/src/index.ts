import { serve } from '@hono/node-server';

import { appConfig } from './config.js';
import { DisscoCSDatabase } from './database/database.js';
import { describeError } from './infrastructure/describe-error.js';
import { HonourBoardRepository } from './madoc-db/honour-board.repository.js';
import { MadocDbPools } from './madoc-db/pools.js';
import { StatsRepository } from './madoc-db/stats.repository.js';
import { createDisscoCSApp } from './app.js';

export async function bootstrap(): Promise<void> {
  const database = new DisscoCSDatabase();
  const madocDbPools = new MadocDbPools();
  const app = createDisscoCSApp(database, new StatsRepository(madocDbPools), new HonourBoardRepository(madocDbPools));

  // A promise nobody awaited (e.g. a background refresh) -- no request to attach it to.
  process.on('unhandledRejection', reason => {
    console.error('[process] unhandled rejection', reason);
    void database.appLog.record({ level: 'error', source: 'backend', ...describeError(reason) });
  });

  // A throw nobody caught leaves the process in an unknown state (Node's own advice: stop), so log
  // it and exit; Docker restarts the container. The log write gets 2 seconds at most, so a database
  // that is down cannot keep a broken process alive.
  process.on('uncaughtException', error => {
    console.error('[process] uncaught exception', error);
    const logged = database.appLog.record({ level: 'error', source: 'backend', ...describeError(error) });
    const timeout = new Promise(resolve => setTimeout(resolve, 2000));
    void Promise.race([logged, timeout]).finally(() => process.exit(1));
  });

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
