import { z } from 'zod';
import {
  ANNOUNCEMENT_TARGET_TYPES,
  AnnouncementTargetType,
  NAV_ITEM_CONTENT_KEYS,
  NAV_ITEM_KEYS,
  SITE_PAGE_LANGS,
  NavItemContentKey,
  NavItemKey,
  SitePageLang,
  sitePageLangSchema,
} from '@dissco-cs/shared-types';

export const CONTACT_RATE_LIMIT = { maxAttempts: 5, windowMs: 10 * 60 * 1000 };

const idOrNull = z.union([z.number().int(), z.string().regex(/^\d+$/).transform(Number)]).nullable();
export const pruneProjectLinksSchema = z.object({ liveSlugs: z.array(z.string().trim().min(1)).min(1) });
export const setManualLinkSchema = z.object({ manualId: idOrNull });
export const setInstitutionLinkSchema = z.object({ institutionId: idOrNull });
export const setInstitutionsOrderSchema = z.object({ order: z.array(z.number().int()) });

export const setNavItemActiveSchema = z.object({ isActive: z.boolean() });
export const setShowContactFormSchema = z.object({ showForm: z.boolean() });

export function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  const forwardedFor = c.req.header('x-forwarded-for');
  return c.req.header('x-real-ip') ?? forwardedFor?.split(',')[0]?.trim() ?? 'unknown';
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isNavItemKey(value: unknown): value is NavItemKey {
  return typeof value === 'string' && (NAV_ITEM_KEYS as readonly string[]).includes(value);
}

export function isNavItemContentKey(value: unknown): value is NavItemContentKey {
  return typeof value === 'string' && (NAV_ITEM_CONTENT_KEYS as readonly string[]).includes(value);
}

export function isSitePageLang(value: unknown): value is SitePageLang {
  return typeof value === 'string' && (SITE_PAGE_LANGS as readonly string[]).includes(value);
}

export function isAnnouncementTargetType(value: unknown): value is AnnouncementTargetType {
  return typeof value === 'string' && (ANNOUNCEMENT_TARGET_TYPES as readonly string[]).includes(value);
}

export function isNavItemKeyPermutation(value: unknown): value is NavItemKey[] {
  if (!Array.isArray(value) || value.length !== NAV_ITEM_KEYS.length) {
    return false;
  }
  const seen = new Set(value);
  return seen.size === NAV_ITEM_KEYS.length && NAV_ITEM_KEYS.every(key => seen.has(key));
}

export const setNavItemContentSchema = z.object({ lang: sitePageLangSchema, contentMd: z.string() });
export const setNavItemsOrderSchema = z.object({ order: z.custom<NavItemKey[]>(isNavItemKeyPermutation) });

