import { Hono } from 'hono';
import { resolveSiteId } from '../jwt.js';
import { mailer } from '../mailer.js';
import { isRateLimited } from '../rate-limit.js';
import { CONTACT_RATE_LIMIT, getClientIp, isEmailLike, isNonEmptyString } from '../validators.js';
export function contactRoutes(repository) {
    const app = new Hono();
    app.post('/', async (c) => {
        const siteId = await resolveSiteId(c);
        if (siteId === null) {
            return c.text('Could not resolve site', 400);
        }
        const payload = (await c.req.json().catch(() => null));
        if (!payload || !isNonEmptyString(payload.name) || !isEmailLike(payload.email) || !isNonEmptyString(payload.message)) {
            return c.text('name, a valid email and message are required', 400);
        }
        // Honeypot: a hidden field real visitors never fill in. If a bot fills it, pretend
        // success without sending anything — no hint that this is what's happening.
        if (isNonEmptyString(payload.website)) {
            return c.body(null, 204);
        }
        if (isRateLimited(`contact:${siteId}:${getClientIp(c)}`, CONTACT_RATE_LIMIT.maxAttempts, CONTACT_RATE_LIMIT.windowMs)) {
            return c.text('Too many requests, please try again later', 429);
        }
        const contactEmail = await repository.sitePages.getContactEmail(siteId);
        if (!contactEmail) {
            return c.text('Contact form is not configured for this site', 503);
        }
        try {
            await mailer.sendMail(contactEmail, {
                subject: `[Contact] ${payload.name}`,
                text: `From: ${payload.name} <${payload.email}>\n\n${payload.message}`,
            });
        }
        catch {
            return c.text('Could not send the message, please try again later', 502);
        }
        return c.body(null, 204);
    });
    return app;
}
