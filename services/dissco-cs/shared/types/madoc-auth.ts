import { MadocInternationalString } from './common.js';

// Payload of GET /auth/invitation (services/madoc-ts/src/routes/dissco-cs-auth.ts's invitationJson).
export type InvitationDto =
  | { expired: true }
  | { id: string; message: MadocInternationalString; role: string; site_role: string };

// Payload shape of Madoc's site-terms endpoint (GET /s/:slug/madoc/api/terms).
export type MadocSiteTermsDto = { id: string; createdAt: string; terms?: { markdown: string; text: string } };
