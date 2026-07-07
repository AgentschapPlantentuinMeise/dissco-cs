import { serve } from '@hono/node-server';
import { appConfig } from './config.js';
import { DisscoCSRepository } from './db.js';
import { createDisscoCSApp } from './app.js';
export async function bootstrap() {
    const repository = new DisscoCSRepository();
    const app = createDisscoCSApp(repository);
    try {
        await repository.waitUntilReady(appConfig.startupRetryCount, appConfig.startupRetryMs);
        if (appConfig.migrate) {
            await repository.migrate();
        }
        serve({
            fetch: app.fetch,
            hostname: appConfig.host,
            port: appConfig.port,
        }, info => {
            console.log(`DiSSCo CS API listening on http://${info.address}:${info.port}`);
        });
        const shutdown = async () => {
            await repository.close();
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
    catch (error) {
        console.error('DiSSCo CS API failed to start', error);
        await repository.close();
        process.exit(1);
    }
}
void bootstrap();
