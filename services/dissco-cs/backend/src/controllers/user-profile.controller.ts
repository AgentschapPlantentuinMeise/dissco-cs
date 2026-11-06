import { Hono } from 'hono';
import { setPreferredLanguageSchema } from '@dissco-cs/shared-types';
import { toUserProfileDto, UserProfileRepository } from '../repositories/user-profile.repository.js';
import { requireUser } from '../auth/auth.js';
import { validateJson } from '../infrastructure/validate-json.js';

// Every route must stay behind the gateway's JWT check: requireUser only reads the JWT's payload,
// and a forged token on a public path could otherwise act as someone else.
export function userProfileController(userProfileRepository: UserProfileRepository): Hono {
  const app = new Hono();

  app.get('/', async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    return c.json(toUserProfileDto(await userProfileRepository.get(identity.userId)));
  });

  app.post('/visit', async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    await userProfileRepository.recordVisit(identity.userId);
    return c.json(toUserProfileDto(await userProfileRepository.get(identity.userId)));
  });

  app.put('/language', validateJson(setPreferredLanguageSchema), async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    await userProfileRepository.setLanguage(identity.userId, c.req.valid('json').language);
    return c.body(null, 204);
  });

  // The name comes from the JWT, which Madoc renews when it changes the name: a client cannot put
  // another name on the user's messages this way.
  app.post('/sync-name', async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    await userProfileRepository.syncName(identity.userId, identity.name);
    return c.body(null, 204);
  });

  return app;
}
