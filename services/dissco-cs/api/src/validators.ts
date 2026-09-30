import { z } from 'zod';
import {
  ANNOUNCEMENT_TARGET_TYPES,
  AnnouncementTargetType,
  SITE_PAGE_CONTENT_KEYS,
  SITE_PAGE_KEYS,
  SITE_PAGE_LANGS,
  SitePageContentKey,
  SitePageKey,
  SitePageLang,
} from '@dissco-cs/shared-types';
import {
  PruneProjectLinksBody,
  SetInstitutionLinkBody,
  SetManualContentBody,
  SetManualLinkBody,
  SetManualTitleBody,
} from './types/request-bodies.js';

export const MAX_MANUAL_TITLE_LENGTH = 200;
export const MAX_MANUAL_CONTENT_LENGTH = 200_000;
export const MAX_MANUAL_ATTACHMENT_LENGTH = 8_000_000;
export const CONTACT_RATE_LIMIT = { maxAttempts: 5, windowMs: 10 * 60 * 1000 };

const idOrNull = z.union([z.number().int(), z.string().regex(/^\d+$/).transform(Number)]).nullable();
export const pruneProjectLinksSchema = z.object({ liveSlugs: z.array(z.string().trim().min(1)).min(1) });

export function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  const forwardedFor = c.req.header('x-forwarded-for');
  return c.req.header('x-real-ip') ?? forwardedFor?.split(',')[0]?.trim() ?? 'unknown';
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isEmailLike(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isSitePageKey(value: unknown): value is SitePageKey {
  return typeof value === 'string' && (SITE_PAGE_KEYS as readonly string[]).includes(value);
}

export function isSitePageContentKey(value: unknown): value is SitePageContentKey {
  return typeof value === 'string' && (SITE_PAGE_CONTENT_KEYS as readonly string[]).includes(value);
}

export function isSitePageLang(value: unknown): value is SitePageLang {
  return typeof value === 'string' && (SITE_PAGE_LANGS as readonly string[]).includes(value);
}

export function isAnnouncementTargetType(value: unknown): value is AnnouncementTargetType {
  return typeof value === 'string' && (ANNOUNCEMENT_TARGET_TYPES as readonly string[]).includes(value);
}

export function isSitePageKeyPermutation(value: unknown): value is SitePageKey[] {
  if (!Array.isArray(value) || value.length !== SITE_PAGE_KEYS.length) {
    return false;
  }
  const seen = new Set(value);
  return seen.size === SITE_PAGE_KEYS.length && SITE_PAGE_KEYS.every(key => seen.has(key));
}

export function isValidManualTitle(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_MANUAL_TITLE_LENGTH;
}

export function isValidManualContent(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_MANUAL_CONTENT_LENGTH;
}

export function parseSetManualTitleBody(payload: SetManualTitleBody | null): { lang: SitePageLang; title: string } | null {
  if (!payload || !isSitePageLang(payload.lang) || !isValidManualTitle(payload.title)) {
    return null;
  }

  return { lang: payload.lang, title: (payload.title as string).trim() };
}

export function parseSetManualContentBody(payload: SetManualContentBody | null): { content: string } | null {
  if (!payload || !isValidManualContent(payload.content)) {
    return null;
  }

  return { content: payload.content as string };
}

export function parseSetManualLinkBody(payload: SetManualLinkBody | null): { manualId: number | null } | null {
  if (!payload) {
    return null;
  }

  if (payload.manualId === null) {
    return { manualId: null };
  }

  // BIGSERIAL-kolommen komen via pg als string terug (bigint-precisie), dus manual.id reist
  // als JSON-string mee via createManual() -> setLink(); numerieke strings hier ook aanvaarden.
  const manualId = typeof payload.manualId === 'string' ? Number(payload.manualId) : payload.manualId;

  if (typeof manualId === 'number' && Number.isInteger(manualId)) {
    return { manualId };
  }

  return null;
}

export function parseSetInstitutionLinkBody(payload: SetInstitutionLinkBody | null): { institutionId: number | null } | null {
  if (!payload) {
    return null;
  }

  if (payload.institutionId === null) {
    return { institutionId: null };
  }

  // BIGSERIAL-kolommen komen via pg als string terug; institution.id kan zo als JSON-string
  // meereizen -- numerieke strings hier ook aanvaarden (zie parseSetManualLinkBody).
  const institutionId = typeof payload.institutionId === 'string' ? Number(payload.institutionId) : payload.institutionId;

  if (typeof institutionId === 'number' && Number.isInteger(institutionId)) {
    return { institutionId };
  }

  return null;
}

// Lege array wordt geweigerd (null) -- zonder deze guard zou een lege lijst (bv. door een
// tijdelijk falende Madoc-call) via pruneOrphanedProjectLinks() alle links van de site wissen.
export function parsePruneProjectLinksBody(payload: PruneProjectLinksBody | null): { liveSlugs: string[] } | null {
  if (!payload || !Array.isArray(payload.liveSlugs) || payload.liveSlugs.length === 0) {
    return null;
  }

  if (!payload.liveSlugs.every(isNonEmptyString)) {
    return null;
  }

  return { liveSlugs: payload.liveSlugs as string[] };
}
