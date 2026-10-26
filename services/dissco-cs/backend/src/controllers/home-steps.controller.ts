import { Hono } from 'hono';
import { setHomeStepsSchema } from '@dissco-cs/shared-types';
import { HomeStepsRepository, toHomeStepDto } from '../repositories/home-steps.repository.js';
import { requireSiteAdmin, requireSiteId } from '../auth/auth.js';
import { validateJson } from '../infrastructure/validate-json.js';

export function homeStepsController(homeStepsRepository: HomeStepsRepository): Hono {
  const app = new Hono();

  app.get('/', async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const steps = await homeStepsRepository.list(siteId);
    return c.json({ steps: steps.map(toHomeStepDto) });
  });

  // The write lives under /steps, not on / itself: the gateway lets /home-steps through without
  // checking the JWT (anonymous visitors see the steps on Home), and requireSiteAdmin only reads
  // the JWT's payload.
  app.put('/steps', validateJson(setHomeStepsSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    await homeStepsRepository.replace(identity.siteId, c.req.valid('json').steps);
    return c.body(null, 204);
  });

  return app;
}
