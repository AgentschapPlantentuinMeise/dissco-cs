import { z } from 'zod';
import { emailSchema, MultilingualText, sitePageLangSchema } from './common.js';

// The order of this list is the default menu order, for sites that never changed it
// (nav_items.sort_order).
export const NAV_ITEM_KEYS = ['institutions', 'forum', 'about', 'help', 'contact', 'welcome'] as const;
export type NavItemKey = (typeof NAV_ITEM_KEYS)[number];

export const NAV_ITEM_CONTENT_KEYS = ['about', 'help', 'contact', 'welcome'] as const;
export type NavItemContentKey = (typeof NAV_ITEM_CONTENT_KEYS)[number];

/**
 * Whether a value is one of the optional pages (NAV_ITEM_KEYS).
 * E.g. a URL or query parameter that still has to be checked.
 * @param value anything
 * Returns: true, and narrows the type, when it is.
 */
export function isNavItemKey(value: unknown): value is NavItemKey {
  return typeof value === 'string' && (NAV_ITEM_KEYS as readonly string[]).includes(value);
}

/**
 * Whether a value is one of the pages with editable content (NAV_ITEM_CONTENT_KEYS).
 * E.g. a URL or query parameter that still has to be checked.
 * @param value anything
 * Returns: true, and narrows the type, when it is.
 */
export function isNavItemContentKey(value: unknown): value is NavItemContentKey {
  return typeof value === 'string' && (NAV_ITEM_CONTENT_KEYS as readonly string[]).includes(value);
}

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
