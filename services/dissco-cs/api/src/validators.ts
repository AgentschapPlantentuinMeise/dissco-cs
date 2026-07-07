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

export const MAX_LOGO_LENGTH = 3_000_000;
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

export function parseAnnouncementBody(
  payload: AnnouncementBody | null
): {
  title: string;
  description: string;
  targetType: AnnouncementTargetType;
  targetProjectSlug: string | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
} | null {
  if (
    !payload ||
    !isNonEmptyString(payload.title) ||
    !isNonEmptyString(payload.description) ||
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

  if (
    isNonEmptyString(payload.startDate) &&
    isNonEmptyString(payload.endDate) &&
    Date.parse(payload.startDate) > Date.parse(payload.endDate)
  ) {
    return null;
  }

  return {
    title: payload.title,
    description: payload.description,
    targetType: payload.targetType,
    targetProjectSlug: payload.targetType === 'project' ? (payload.targetProjectSlug as string) : null,
    isActive: payload.isActive,
    startDate: (payload.startDate as string | null) ?? null,
    endDate: (payload.endDate as string | null) ?? null,
  };
}
