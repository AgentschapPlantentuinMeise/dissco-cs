import { InternationalString } from './madoc-project.js';

// Payload of GET /auth/invitation (services/madoc-ts/src/routes/dissco-cs-auth.ts's invitationJson).
export type InvitationResponse =
  | { expired: true }
  | { id: string; message: InternationalString; role: string; site_role: string };
