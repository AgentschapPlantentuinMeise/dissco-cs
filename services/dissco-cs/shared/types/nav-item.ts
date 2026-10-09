import { z } from 'zod';
import { emailSchema, MultilingualText, sitePageLangSchema } from './common.js';

// Order here is the default display order (navbar + page management) for sites that
// haven't customized it yet — see `sort_order` on the `nav_items` table.
export const NAV_ITEM_KEYS = ['institutions', 'forum', 'about', 'help', 'contact', 'welcome'] as const;
export type NavItemKey = (typeof NAV_ITEM_KEYS)[number];

export const NAV_ITEM_CONTENT_KEYS = ['about', 'help', 'contact', 'welcome'] as const;
export type NavItemContentKey = (typeof NAV_ITEM_CONTENT_KEYS)[number];

export function isNavItemKey(value: unknown): value is NavItemKey {
  return typeof value === 'string' && (NAV_ITEM_KEYS as readonly string[]).includes(value);
}

export function isNavItemContentKey(value: unknown): value is NavItemContentKey {
  return typeof value === 'string' && (NAV_ITEM_CONTENT_KEYS as readonly string[]).includes(value);
}

// Wire shape (dates as ISO strings). The API repository keeps its own local `NavItemRow`
// type with `updated_at: Date` for internal use; route handlers send this shape.
export type NavItemDto = {
  site_id: number;
  page_key: NavItemKey;
  is_active: boolean;
  content: MultilingualText;
  contact_email: string | null;
  show_contact_form: boolean;
  sort_order: number;
  updated_at: string;
};

export const setContactEmailSchema = z.object({ email: emailSchema });
export type SetContactEmailInput = z.infer<typeof setContactEmailSchema>;

export const setNavItemActiveSchema = z.object({ isActive: z.boolean() });
export const setShowContactFormSchema = z.object({ showForm: z.boolean() });
export const setNavItemContentSchema = z.object({ lang: sitePageLangSchema, contentMd: z.string() });

function isNavItemKeyPermutation(value: unknown): value is NavItemKey[] {
  if (!Array.isArray(value) || value.length !== NAV_ITEM_KEYS.length) {
    return false;
  }
  const seen = new Set(value);
  return seen.size === NAV_ITEM_KEYS.length && NAV_ITEM_KEYS.every(key => seen.has(key));
}

export const setNavItemsOrderSchema = z.object({ order: z.custom<NavItemKey[]>(isNavItemKeyPermutation) });
