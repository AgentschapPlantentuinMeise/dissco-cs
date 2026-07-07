import { readFileSync } from 'fs';
import { appConfig } from './config.js';
function getServiceJwt() {
    const jwtJsonString = readFileSync(appConfig.madocServiceJwtPath).toString('utf-8');
    return JSON.parse(jwtJsonString).token;
}
export async function getMadocProject(siteId, projectId) {
    const response = await fetch(`${appConfig.madocGatewayUrl}/api/madoc/projects/${projectId}`, {
        headers: {
            Authorization: `Bearer ${getServiceJwt()}`,
            'x-madoc-site-id': String(siteId),
        },
    });
    if (!response.ok) {
        throw new Error(`Madoc project request failed with status ${response.status}`);
    }
    return response.json();
}
const siteIdBySlugCache = new Map();
export async function getSiteIdBySlug(slug) {
    const cached = siteIdBySlugCache.get(slug);
    if (cached !== undefined) {
        return cached;
    }
    const response = await fetch(`${appConfig.madocGatewayUrl}/s/${slug}/madoc/api/site`, {
        headers: {
            Authorization: `Bearer ${getServiceJwt()}`,
        },
    });
    if (!response.ok) {
        return null;
    }
    const site = (await response.json());
    if (typeof site.id !== 'number') {
        return null;
    }
    siteIdBySlugCache.set(slug, site.id);
    return site.id;
}
