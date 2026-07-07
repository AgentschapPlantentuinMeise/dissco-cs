import { Hono } from 'hono';
import { DisscoCSRepository } from '../db.js';
import { requireSiteAdmin, resolveSiteId } from '../jwt.js';
import {
  SetContactEmailBody,
  SetPageActiveBody,
  SetPageContentBody,
  SetPagesOrderBody,
  SetShowContactFormBody,
  isEmailLike,
  isSitePageContentKey,
  isSitePageKey,
  isSitePageKeyPermutation,
  isSitePageLang,
} from '../validators.js';

export function sitePagesRoutes(repository: DisscoCSRepository): Hono {
  const app = new Hono();

  app.get('/', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const pages = await repository.sitePages.getSitePages(siteId);
    return c.json({ pages });
  });

  app.put('/order', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const payload = (await c.req.json().catch(() => null)) as SetPagesOrderBody | null;
    if (!payload || !isSitePageKeyPermutation(payload.order)) {
      return c.text('order must contain every page key exactly once', 400);
    }

    await repository.sitePages.setPagesOrder(identity.siteId, payload.order);
    return c.body(null, 204);
  });

  app.put('/contact/email', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const payload = (await c.req.json().catch(() => null)) as SetContactEmailBody | null;
    if (!payload || !isEmailLike(payload.email)) {
      return c.text('A valid email is required', 400);
    }

    await repository.sitePages.setContactEmail(identity.siteId, payload.email);
    return c.body(null, 204);
  });

  app.put('/contact/show-form', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const payload = (await c.req.json().catch(() => null)) as SetShowContactFormBody | null;
    if (!payload || typeof payload.showForm !== 'boolean') {
      return c.text('showForm must be a boolean', 400);
    }

    await repository.sitePages.setShowContactForm(identity.siteId, payload.showForm);
    return c.body(null, 204);
  });

  app.put('/:key/content', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const pageKey = c.req.param('key');
    if (!isSitePageContentKey(pageKey)) {
      return c.notFound();
    }

    const payload = (await c.req.json().catch(() => null)) as SetPageContentBody | null;
    if (!payload || !isSitePageLang(payload.lang) || typeof payload.contentMd !== 'string') {
      return c.text('lang and contentMd are required', 400);
    }

    await repository.sitePages.upsertPageContent(identity.siteId, pageKey, payload.lang, payload.contentMd);
    return c.body(null, 204);
  });

  app.put('/:key', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const pageKey = c.req.param('key');
    if (!isSitePageKey(pageKey)) {
      return c.notFound();
    }

    const payload = (await c.req.json().catch(() => null)) as SetPageActiveBody | null;
    if (!payload || typeof payload.isActive !== 'boolean') {
      return c.text('isActive must be a boolean', 400);
    }

    await repository.sitePages.setPageActive(identity.siteId, pageKey, payload.isActive);
    return c.body(null, 204);
  });

  return app;
}
