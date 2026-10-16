import { Hono } from 'hono';
import { NavItemsRepository, toNavItemDto } from '../repositories/nav-items.repository.js';
import { requireSiteAdmin, requireSiteId } from '../auth/auth.js';
import { validateJson } from '../infrastructure/validate-json.js';
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
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const navItems = await navItemsRepository.getNavItems(siteId);
    return c.json({ navItems: navItems.map(toNavItemDto) });
  });

  // Reads the stored address itself instead of using getContactEmail(): that function is meant
  // for sending mail and returns nothing while the contact page is switched off, but the admin
  // must still be able to see and edit the address.
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

  app.put('/order', validateJson(setNavItemsOrderSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const input = c.req.valid('json');

    await navItemsRepository.setNavItemsOrder(identity.siteId, input.order);
    return c.body(null, 204);
  });

  app.put('/contact/email', validateJson(setContactEmailSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const input = c.req.valid('json');

    await navItemsRepository.setContactEmail(identity.siteId, input.email);
    return c.body(null, 204);
  });

  app.put('/contact/show-form', validateJson(setShowContactFormSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const input = c.req.valid('json');

    await navItemsRepository.setShowContactForm(identity.siteId, input.showContactForm);
    return c.body(null, 204);
  });

  app.put('/:key/content', validateJson(setNavItemContentSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const pageKey = c.req.param('key');
    if (!isNavItemContentKey(pageKey)) {
      return c.notFound();
    }

    const input = c.req.valid('json');

    await navItemsRepository.upsertNavItemContent(identity.siteId, pageKey, input.lang, input.contentMd);
    return c.body(null, 204);
  });

  app.patch('/:key', validateJson(setNavItemActiveSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const pageKey = c.req.param('key');
    if (!isNavItemKey(pageKey)) {
      return c.notFound();
    }

    const input = c.req.valid('json');

    await navItemsRepository.setNavItemActive(identity.siteId, pageKey, input.isActive);
    return c.body(null, 204);
  });

  return app;
}
