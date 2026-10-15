import { Hono } from 'hono';
import { NavItemsRepository } from '../repositories/nav-items.repository.js';
import { requireSiteId } from '../auth/auth.js';
import { mailer } from '../infrastructure/mailer.js';
import { getClientIp, isRateLimited } from '../infrastructure/rate-limit.js';
import { passErrorOn } from '../infrastructure/request-log.js';
import { validateJson } from '../infrastructure/validate-json.js';
import { contactSubmissionSchema } from '@dissco-cs/shared-types';

const CONTACT_RATE_LIMIT = { maxAttempts: 5, windowMs: 10 * 60 * 1000 };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function contactController(navItemsRepository: NavItemsRepository): Hono {
  const app = new Hono();

  app.post('/', validateJson(contactSubmissionSchema), async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const payload = c.req.valid('json');

    // Honeypot: a hidden field real visitors never fill in. If a bot fills it, pretend
    // success without sending anything — no hint that this is what's happening.
    if (isNonEmptyString(payload.website)) {
      return c.body(null, 204);
    }

    if (isRateLimited(`contact:${siteId}:${getClientIp(c)}`, CONTACT_RATE_LIMIT.maxAttempts, CONTACT_RATE_LIMIT.windowMs)) {
      return c.json({ error: 'Too many requests, please try again later' }, 429);
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
      // E.g. SMTP not configured or unreachable -- stored centrally so it doesn't go unnoticed.
      passErrorOn(c, err);
      return c.json({ error: 'Could not send the message, please try again later' }, 502);
    }

    return c.body(null, 204);
  });

  return app;
}
