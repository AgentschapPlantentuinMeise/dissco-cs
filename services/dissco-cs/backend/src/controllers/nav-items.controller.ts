import { Hono } from 'hono';
import { DisscoCSRepository } from '../db.js';
import { requireSiteAdmin, resolveSiteId } from '../jwt.js';
import {
  isNavItemContentKey,
  isNavItemKey,
  setNavItemActiveSchema,
  setNavItemContentSchema,
  setNavItemsOrderSchema,
  setShowContactFormSchema,
} from '../validators.js';
import { setContactEmailSchema } from '@dissco-cs/shared-types';

export function navItemsController(repository: DisscoCSRepository): Hono {
  const app = new Hono();

  app.get('/', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const navItems = await repository.navItems.getNavItems(siteId);
    return c.json({ navItems });
  });

  app.put('/order', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const result = setNavItemsOrderSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('order must contain every page key exactly once', 400);
    }

    await repository.navItems.setNavItemsOrder(identity.siteId, result.data.order);
    return c.body(null, 204);
  });

  app.put('/contact/email', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const result = setContactEmailSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('A valid email is required', 400);
    }

    await repository.navItems.setContactEmail(identity.siteId, result.data.email);
    return c.body(null, 204);
  });

  app.put('/contact/show-form', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const result = setShowContactFormSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('showForm must be a boolean', 400);
    }

    await repository.navItems.setShowContactForm(identity.siteId, result.data.showForm);
    return c.body(null, 204);
  });

  app.put('/:key/content', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const pageKey = c.req.param('key');
    if (!isNavItemContentKey(pageKey)) {
      return c.notFound();
    }

    const result = setNavItemContentSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('lang and contentMd are required', 400);
    }

    await repository.navItems.upsertNavItemContent(identity.siteId, pageKey, result.data.lang, result.data.contentMd);
    return c.body(null, 204);
  });

  app.put('/:key', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const pageKey = c.req.param('key');
    if (!isNavItemKey(pageKey)) {
      return c.notFound();
    }

    const result = setNavItemActiveSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('isActive must be a boolean', 400);
    }

    await repository.navItems.setNavItemActive(identity.siteId, pageKey, result.data.isActive);
    return c.body(null, 204);
  });

  return app;
}
