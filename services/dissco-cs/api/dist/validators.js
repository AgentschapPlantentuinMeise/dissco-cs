import { ANNOUNCEMENT_TARGET_TYPES } from './repositories/announcements.repository.js';
import { SITE_PAGE_CONTENT_KEYS, SITE_PAGE_KEYS, SITE_PAGE_LANGS, } from './repositories/site-pages.repository.js';
export const MAX_LOGO_LENGTH = 3_000_000;
export const CONTACT_RATE_LIMIT = { maxAttempts: 5, windowMs: 10 * 60 * 1000 };
export function getClientIp(c) {
    const forwardedFor = c.req.header('x-forwarded-for');
    return c.req.header('x-real-ip') ?? forwardedFor?.split(',')[0]?.trim() ?? 'unknown';
}
export function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
export function isEmailLike(value) {
    return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
export function isSitePageKey(value) {
    return typeof value === 'string' && SITE_PAGE_KEYS.includes(value);
}
export function isSitePageContentKey(value) {
    return typeof value === 'string' && SITE_PAGE_CONTENT_KEYS.includes(value);
}
export function isSitePageLang(value) {
    return typeof value === 'string' && SITE_PAGE_LANGS.includes(value);
}
export function isAnnouncementTargetType(value) {
    return typeof value === 'string' && ANNOUNCEMENT_TARGET_TYPES.includes(value);
}
export function isIsoDateOrNull(value) {
    if (value === null || value === undefined) {
        return true;
    }
    return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}
export function isOptionalString(value) {
    return value === null || value === undefined || typeof value === 'string';
}
export function isMultilingualText(value, requireFilled) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const record = value;
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
export function isValidLogo(value) {
    if (value === null || value === undefined) {
        return true;
    }
    return typeof value === 'string' && value.startsWith('data:image/') && value.length <= MAX_LOGO_LENGTH;
}
export function isSitePageKeyPermutation(value) {
    if (!Array.isArray(value) || value.length !== SITE_PAGE_KEYS.length) {
        return false;
    }
    const seen = new Set(value);
    return seen.size === SITE_PAGE_KEYS.length && SITE_PAGE_KEYS.every(key => seen.has(key));
}
export function parseInstitutionBody(payload) {
    if (!payload ||
        !isMultilingualText(payload.name, true) ||
        !isMultilingualText(payload.description, false) ||
        !isOptionalString(payload.email) ||
        !isOptionalString(payload.phone) ||
        !isOptionalString(payload.website) ||
        !isValidLogo(payload.logo) ||
        typeof payload.isActive !== 'boolean') {
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
export function parseAnnouncementBody(payload) {
    if (!payload ||
        !isNonEmptyString(payload.title) ||
        !isNonEmptyString(payload.description) ||
        !isAnnouncementTargetType(payload.targetType) ||
        typeof payload.isActive !== 'boolean' ||
        !isIsoDateOrNull(payload.startDate ?? null) ||
        !isIsoDateOrNull(payload.endDate ?? null)) {
        return null;
    }
    if (payload.targetType === 'project' && !isNonEmptyString(payload.targetProjectSlug)) {
        return null;
    }
    if (isNonEmptyString(payload.startDate) &&
        isNonEmptyString(payload.endDate) &&
        Date.parse(payload.startDate) > Date.parse(payload.endDate)) {
        return null;
    }
    return {
        title: payload.title,
        description: payload.description,
        targetType: payload.targetType,
        targetProjectSlug: payload.targetType === 'project' ? payload.targetProjectSlug : null,
        isActive: payload.isActive,
        startDate: payload.startDate ?? null,
        endDate: payload.endDate ?? null,
    };
}
