import { Hono, type Env } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';
import { NavItemsRepository } from '../repositories/nav-items.repository.js';
import { requireSiteId, resolveSiteId } from '../auth/auth.js';
import { mailer } from '../infrastructure/mailer.js';
import { getClientIp } from '../infrastructure/rate-limit.js';
import { passErrorOn } from '../infrastructure/request-log.js';
import { validateJson } from '../infrastructure/validate-json.js';
import { contactSubmissionSchema, type ContactSubmissionInput } from '@dissco-cs/shared-types';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function contactController(navItemsRepository: NavItemsRepository): Hono {
  const app = new Hono();

  // Typed with the validated body, so skip can read it: the limiter runs after validateJson.
  const contactRateLimit = rateLimiter<Env, string, { out: { json: ContactSubmissionInput } }>({
    windowMs: 10 * 60 * 1000,
    limit: 5,
    keyGenerator: async c => `${await resolveSiteId(c)}:${getClientIp(c)}`,
    // A bot caught by the honeypot below gets a fake 204. Counting its attempts here would
    // eventually answer it with a 429 instead, which tells it the trap exists.
    skip: c => isNonEmptyString(c.req.valid('json').website),
    message: { error: 'Too many requests, please try again later' },
  });

  app.post('/', validateJson(contactSubmissionSchema), contactRateLimit, async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const payload = c.req.valid('json');

    // The hidden "website" field is a trap for bots: people never see it. When it is filled in, we
    // act as if the message was sent, without sending it and without telling the bot why.
    if (isNonEmptyString(payload.website)) {
      return c.body(null, 204);
    }

    const contactEmail = await navItemsRepository.getContactEmail(siteId);
    if (!contactEmail) {
      return c.json({ error: 'Contact form is not configured for this site' }, 503);
    }

    try {
      await mailer.sendMail(contactEmail, {
        subject: `[Contact] ${payload.name}`,
        text: `From: ${payload.name} <${payload.email}>\n\n${payload.message}`,
      });
    } catch (err) {
      // The mail could not be sent (e.g. the mail server is down): the error is logged centrally and
      // the visitor gets a 502.
      passErrorOn(c, err);
      return c.json({ error: 'Could not send the message, please try again later' }, 502);
    }

    return c.body(null, 204);
  });

  return app;
}
