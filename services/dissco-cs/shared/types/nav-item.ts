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
  showContactForm: boolean;
  sortOrder: number;
};

export type NavItemContactEmailDto = { email: string | null };

export const setContactEmailSchema = z.object({ email: emailSchema });

export const setNavItemActiveSchema = z.object({ isActive: z.boolean() });
export const setShowContactFormSchema = z.object({ showContactForm: z.boolean() });
export const setNavItemContentSchema = z.object({ lang: sitePageLangSchema, contentMd: z.string() });

function isNavItemKeyPermutation(value: unknown): value is NavItemKey[] {
  if (!Array.isArray(value) || value.length !== NAV_ITEM_KEYS.length) {
    return false;
  }
  const seen = new Set(value);
  return seen.size === NAV_ITEM_KEYS.length && NAV_ITEM_KEYS.every(key => seen.has(key));
}

export const setNavItemsOrderSchema = z.object({ order: z.custom<NavItemKey[]>(isNavItemKeyPermutation) });
