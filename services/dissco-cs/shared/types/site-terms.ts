// Payload shape of Madoc's site-terms endpoint (GET /s/:slug/madoc/api/terms).
export type SiteTerms = { id: string; createdAt: string; terms?: { markdown: string; text: string } };

// Returned by the dissco-cs-auth login route (services/madoc-ts/src/routes/dissco-cs-auth.ts) --
// hasAccepted is computed server-side from the logged-in user's terms_accepted list against the
// latest SiteTerms.
export type TermsStatus = { hasTerms: boolean; hasAccepted: boolean };
