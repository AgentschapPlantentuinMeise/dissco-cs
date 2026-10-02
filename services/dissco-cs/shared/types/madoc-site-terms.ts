// Payload shape of Madoc's site-terms endpoint (GET /s/:slug/madoc/api/terms).
export type MadocSiteTermsDto = { id: string; createdAt: string; terms?: { markdown: string; text: string } };
