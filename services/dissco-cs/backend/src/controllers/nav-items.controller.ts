import { Hono } from 'hono';
import { NavItemsRepository, toNavItemDto } from '../repositories/nav-items.repository.js';
import { requireSiteAdmin, resolveSiteId } from '../auth/auth.js';
import {
  isNavItemContentKey,
  isNavItemKey,
  NavItemContactEmailDto,
  setContactEmailSchema,
  setNavItemActiveSchema,
  setNavItemContentSchema,
  setNavItemsOrderSchema,
  setShowContactFormSchema,
} from '@dissco-cs/shared-types';

export function navItemsController(navItemsRepository: NavItemsRepository): Hono {
  const app = new Hono();

  app.get('/', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const navItems = await navItemsRepository.getNavItems(siteId);
    return c.json({ navItems: navItems.map(toNavItemDto) });
  });

  // Admin-only: unlike getContactEmail() (used for sending), this returns the stored address even
  // while the contact page is inactive, so page management can show and edit it.
  app.get('/contact/email', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const navItems = await navItemsRepository.getNavItems(identity.siteId);
    const result: NavItemContactEmailDto = {
      email: navItems.find(item => item.page_key === 'contact')?.contact_email ?? null,
    };
    return c.json(result);
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

    await navItemsRepository.setNavItemsOrder(identity.siteId, result.data.order);
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

    await navItemsRepository.setContactEmail(identity.siteId, result.data.email);
    return c.body(null, 204);
  });

  app.put('/contact/show-form', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const result = setShowContactFormSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('showContactForm must be a boolean', 400);
    }

    await navItemsRepository.setShowContactForm(identity.siteId, result.data.showContactForm);
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

    await navItemsRepository.upsertNavItemContent(identity.siteId, pageKey, result.data.lang, result.data.contentMd);
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

    await navItemsRepository.setNavItemActive(identity.siteId, pageKey, result.data.isActive);
    return c.body(null, 204);
  });

  return app;
}
