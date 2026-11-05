import { Hono } from 'hono';
import { UserProfileRepository } from '../repositories/user-profile.repository.js';
import { requireUser } from '../auth/auth.js';

export function userProfileController(userProfileRepository: UserProfileRepository): Hono {
  const app = new Hono();

  // Must stay behind the gateway's JWT check: requireUser only reads the JWT's payload, and a forged
  // token on a public path could otherwise keep someone else's account from counting as inactive.
  app.post('/visit', async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    await userProfileRepository.recordVisit(identity.userId);
    return c.body(null, 204);
  });

  return app;
}
