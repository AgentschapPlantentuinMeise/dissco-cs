import { z } from 'zod';
import { emailSchema, MultilingualText, sitePageLangSchema } from './common.js';

// The order of this list is the default menu order, for sites that never changed it
// (nav_items.sort_order).
export const NAV_ITEM_KEYS = ['institutions', 'forum', 'about', 'help', 'contact', 'welcome'] as const;
export type NavItemKey = (typeof NAV_ITEM_KEYS)[number];

export const NAV_ITEM_CONTENT_KEYS = ['about', 'help', 'contact', 'welcome'] as const;
export type NavItemContentKey = (typeof NAV_ITEM_CONTENT_KEYS)[number];

// No contact email in here on purpose: that is for admins only (NavItemContactEmailDto).
export type NavItemDto = {
  pageKey: NavItemKey;
  isActive: boolean;
  content: MultilingualText;
  // The short text under the title in the page's header.
  intro: MultilingualText;
  showContactForm: boolean;
  sortOrder: number;
};

export type NavItemContactEmailDto = { email: string | null };

export const setContactEmailSchema = z.object({ email: emailSchema });

export const setNavItemActiveSchema = z.object({ isActive: z.boolean() });
export const setShowContactFormSchema = z.object({ showContactForm: z.boolean() });
// About two lines in the header.
export const MAX_NAV_ITEM_INTRO_LENGTH = 200;

export const setNavItemContentSchema = z.object({
  lang: sitePageLangSchema,
  contentMd: z.string(),
  intro: z.string().trim().max(MAX_NAV_ITEM_INTRO_LENGTH),
});
