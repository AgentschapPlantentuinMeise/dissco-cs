import { MadocInternationalString } from './common.js';

// Payload of GET /auth/invitation (services/madoc-ts/src/routes/dissco-cs-auth.ts's invitationJson).
export type InvitationDto =
  | { expired: true }
  | { id: string; message: MadocInternationalString; role: string; site_role: string };
