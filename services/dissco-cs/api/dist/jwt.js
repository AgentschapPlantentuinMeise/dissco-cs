import { getSiteIdBySlug } from './madoc-client.js';
function toBase64(input) {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4;
    if (padding === 0) {
        return normalized;
    }
    return normalized + '='.repeat(4 - padding);
}
function readTokenFromHeaders(context) {
    const bearerHeader = context.req.header('Bearer') ?? context.req.header('BEARER');
    if (bearerHeader) {
        return bearerHeader.replace(/^Bearer\s+/i, '').trim();
    }
    const authorization = context.req.header('Authorization');
    if (!authorization) {
        return undefined;
    }
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (match) {
        return match[1].trim();
    }
    return authorization.trim();
}
export function jwtPayloadFromRequest(context) {
    const token = readTokenFromHeaders(context);
    if (!token) {
        return null;
    }
    const parts = token.split('.');
    if (parts.length < 2 || !parts[1]) {
        return null;
    }
    try {
        const decoded = Buffer.from(toBase64(parts[1]), 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded);
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
    }
    catch {
        return null;
    }
    return null;
}
export function getHeaderMadocSiteUrn(context) {
    const siteId = context.req.header('x-madoc-site-id');
    if (!siteId) {
        return null;
    }
    return `urn:madoc:site:${siteId}`;
}
export function requestMadocSiteUrn(context) {
    const payload = jwtPayloadFromRequest(context);
    if (!payload) {
        return null;
    }
    if (payload.service === true) {
        return getHeaderMadocSiteUrn(context);
    }
    const iss = payload.iss;
    return typeof iss === 'string' ? iss : null;
}
export function requestMadocUserIdentity(context) {
    const payload = jwtPayloadFromRequest(context);
    if (!payload || payload.service === true) {
        return null;
    }
    const sub = payload.sub;
    const iss = payload.iss;
    const name = payload.name;
    if (typeof sub !== 'string' || typeof iss !== 'string' || typeof name !== 'string') {
        return null;
    }
    const userMatch = sub.match(/^urn:madoc:user:(\d+)$/);
    const siteMatch = iss.match(/^urn:madoc:site:(\d+)$/);
    if (!userMatch || !siteMatch) {
        return null;
    }
    const scope = typeof payload.scope === 'string' ? payload.scope.split(' ').filter(Boolean) : [];
    return {
        userId: Number(userMatch[1]),
        siteId: Number(siteMatch[1]),
        name,
        scope,
    };
}
/**
 * Returns the requesting user's identity if they are authenticated and a site admin,
 * or an unauthorized/forbidden Response to return directly from the route handler.
 */
export function requireSiteAdmin(context) {
    const identity = requestMadocUserIdentity(context);
    if (!identity) {
        return context.text('Unauthorized', 401);
    }
    if (!identity.scope.includes('site.admin')) {
        return context.text('Forbidden', 403);
    }
    return identity;
}
/**
 * Resolves the site id for requests that may come from logged-out visitors (no JWT).
 * Logged-in users resolve instantly from their JWT; anonymous visitors are resolved
 * via the `slug` query param against Madoc's public site-by-slug lookup.
 */
export async function resolveSiteId(context) {
    const identity = requestMadocUserIdentity(context);
    if (identity) {
        return identity.siteId;
    }
    const slug = context.req.query('slug');
    if (!slug) {
        return null;
    }
    return getSiteIdBySlug(slug);
}
