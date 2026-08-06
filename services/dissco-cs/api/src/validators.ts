import { ANNOUNCEMENT_TARGET_TYPES, AnnouncementTargetType } from './repositories/announcements.repository.js';
import { InstitutionInput } from './repositories/institutions.repository.js';
import {
  SITE_PAGE_CONTENT_KEYS,
  SITE_PAGE_KEYS,
  SITE_PAGE_LANGS,
  SitePageContentKey,
  SitePageKey,
  SitePageLang,
} from './repositories/site-pages.repository.js';

export type CreateTopicBody = { title?: unknown; taskUrl?: unknown; body?: unknown };
export type CreateReplyBody = { body?: unknown };
export type SetPageActiveBody = { isActive?: unknown };
export type SetPageContentBody = { lang?: unknown; contentMd?: unknown };
export type SetContactEmailBody = { email?: unknown };
export type SetShowContactFormBody = { showForm?: unknown };
export type ContactSubmissionBody = { name?: unknown; email?: unknown; message?: unknown; website?: unknown };
export type SetPagesOrderBody = { order?: unknown };
export type AnnouncementBody = {
  title?: unknown;
  description?: unknown;
  targetType?: unknown;
  targetProjectSlug?: unknown;
  isActive?: unknown;
  startDate?: unknown;
  endDate?: unknown;
};
export type InstitutionBody = {
  name?: unknown;
  description?: unknown;
  email?: unknown;
  phone?: unknown;
  website?: unknown;
  logo?: unknown;
  isActive?: unknown;
};
export type SetInstitutionsOrderBody = { order?: unknown };
export type SetManualTitleBody = { lang?: unknown; title?: unknown };
export type SetManualContentBody = { content?: unknown };
export type SetManualLinkBody = { manualId?: unknown };
export type SetInstitutionLinkBody = { institutionId?: unknown };

export const MAX_LOGO_LENGTH = 3_000_000;
export const MAX_MANUAL_TITLE_LENGTH = 200;
export const MAX_MANUAL_CONTENT_LENGTH = 200_000;
export const MAX_MANUAL_ATTACHMENT_LENGTH = 8_000_000;
export const CONTACT_RATE_LIMIT = { maxAttempts: 5, windowMs: 10 * 60 * 1000 };

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

export function isIsoDateOrNull(value: unknown): value is string | null {
  if (value === null || value === undefined) {
    return true;
  }
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function endOfDayIfDateOnly(value: string | null): string | null {
  if (value === null || !DATE_ONLY_PATTERN.test(value)) {
    return value;
  }
  return `${value}T23:59:59.999`;
}

export function isOptionalString(value: unknown): value is string | null | undefined {
  return value === null || value === undefined || typeof value === 'string';
}

export function isMultilingualText(value: unknown, requireFilled: boolean): value is Partial<Record<SitePageLang, string>> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  for (const lang of SITE_PAGE_LANGS) {
    const entry = record[lang];
    if (entry === undefined) {
      if (requireFilled) {
        return false;
      }
      continue;
    }
    if (typeof entry !== 'string') {
      return false;
    }
    if (requireFilled && entry.trim().length === 0) {
      return false;
    }
  }

  return true;
}

export function isValidLogo(value: unknown): value is string | null {
  if (value === null || value === undefined) {
    return true;
  }
  return typeof value === 'string' && value.startsWith('data:image/') && value.length <= MAX_LOGO_LENGTH;
}

export function isSitePageKeyPermutation(value: unknown): value is SitePageKey[] {
  if (!Array.isArray(value) || value.length !== SITE_PAGE_KEYS.length) {
    return false;
  }
  const seen = new Set(value);
  return seen.size === SITE_PAGE_KEYS.length && SITE_PAGE_KEYS.every(key => seen.has(key));
}

export function parseInstitutionBody(payload: InstitutionBody | null): InstitutionInput | null {
  if (
    !payload ||
    !isMultilingualText(payload.name, true) ||
    !isMultilingualText(payload.description, false) ||
    !isOptionalString(payload.email) ||
    !isOptionalString(payload.phone) ||
    !isOptionalString(payload.website) ||
    !isValidLogo(payload.logo) ||
    typeof payload.isActive !== 'boolean'
  ) {
    return null;
  }

  if (isOptionalString(payload.email) && payload.email && !isEmailLike(payload.email)) {
    return null;
  }

  return {
    name: payload.name,
    description: payload.description,
    email: payload.email || null,
    phone: payload.phone || null,
    website: payload.website || null,
    logo: payload.logo ?? null,
    isActive: payload.isActive,
  };
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

export function parseAnnouncementBody(
  payload: AnnouncementBody | null
): {
  title: Partial<Record<SitePageLang, string>>;
  description: Partial<Record<SitePageLang, string>>;
  targetType: AnnouncementTargetType;
  targetProjectSlug: string | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
} | null {
  if (
    !payload ||
    !isMultilingualText(payload.title, true) ||
    !isMultilingualText(payload.description, true) ||
    !isAnnouncementTargetType(payload.targetType) ||
    typeof payload.isActive !== 'boolean' ||
    !isIsoDateOrNull(payload.startDate ?? null) ||
    !isIsoDateOrNull(payload.endDate ?? null)
  ) {
    return null;
  }

  if (payload.targetType === 'project' && !isNonEmptyString(payload.targetProjectSlug)) {
    return null;
  }

  const startDate = (payload.startDate as string | null) ?? null;
  const endDate = endOfDayIfDateOnly((payload.endDate as string | null) ?? null);

  if (isNonEmptyString(startDate) && isNonEmptyString(endDate) && Date.parse(startDate) > Date.parse(endDate)) {
    return null;
  }

  return {
    title: payload.title,
    description: payload.description,
    targetType: payload.targetType,
    targetProjectSlug: payload.targetType === 'project' ? (payload.targetProjectSlug as string) : null,
    isActive: payload.isActive,
    startDate,
    endDate,
  };
}
