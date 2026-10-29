import { MadocInternationalString } from './common.js';

// Madoc sets no limit on a user's name; our registration does. madoc-ts cannot import this
// package, so routes/dissco-cs-auth.ts holds the same number: change both together.
export const MAX_USER_NAME_LENGTH = 100;

// What Madoc's GET /s/:slug/madoc/api/auth/invitation returns (invitationJson in madoc-ts's
// routes/dissco-cs-auth.ts).
export type InvitationDto =
  | { expired: true }
  | { id: string; message: MadocInternationalString; role: string; site_role: string };

// Payload shape of Madoc's site-terms endpoint (GET /s/:slug/madoc/api/terms).
export type MadocSiteTermsDto = { id: string; createdAt: string; terms?: { markdown: string; text: string } };
