import { publicPost, publicRequest, request } from './request';
import { MadocSiteTermsDto, InvitationDto } from '@dissco-cs/shared-types';

// The one deliberate exception to "the frontend only talks to the dissco-cs backend": madoc-ts's
// own auth flows (login, registration, password reset, invitations, terms). These set and depend
// on madoc-ts's session cookie (the JWT getJwt() reads) and are rate-limited in the gateway, so
// they stay direct. Everything else goes through ../cs-client.
// The routes are in madoc-ts's routes/dissco-cs-auth.ts, except getTerms and acceptTerms (Madoc's own).

/**
 * The invitation behind the code of an invitation link.
 * @param code the code from the link
 * Who: anyone.
 * Returns: the invitation (message, role), or { expired: true }.
 */
export const getInvitation = (code: string) => publicRequest<InvitationDto>('/auth/invitation', { code });

/**
 * The site's latest terms of use.
 * Input: none.
 * Who: anyone.
 * Returns: { latest } -- null when the site has no terms.
 */
export const getTerms = () => publicRequest<{ latest: MadocSiteTermsDto | null }>('/terms');

/**
 * Creates an account and mails a link to set the password.
 * @param data name and email; capToken, the answer of the captcha; code of an invitation
 *   (optional); termsAccepted, required when the site has terms
 * Who: anyone.
 * Returns: { ok, emailSent } -- emailSent false when the mail could not be sent (the site admins
 *   are told). Throws with Madoc's own message when it refuses.
 */
export const register = (data: { name: string; email: string; capToken: string; code?: string; termsAccepted?: boolean }) =>
  publicPost<{ ok: true; emailSent: boolean }>('/auth/register', data);

/**
 * Logs in: Madoc sets its session cookie with the JWT.
 * @param data email and password
 * Who: anyone.
 * Returns: { user } with whether the site has terms (hasTerms) and whether the user accepted the
 *   latest ones (hasAccepted). Throws with Madoc's message, e.g. "Incorrect email or password".
 */
export const login = (data: { email: string; password: string }) =>
  publicPost<{ user: { id: number; name: string; hasTerms: boolean; hasAccepted: boolean } }>('/auth/login', data);

/**
 * Mails a link to set a new password. Answers the same whether or not the email is known, so it
 * does not reveal which addresses have an account.
 * @param data the email address
 * Who: anyone.
 * Returns: { ok }.
 */
export const forgotPassword = (data: { email: string }) => publicPost<{ ok: true }>('/auth/forgot-password', data);

/**
 * Sets the password from a link in a mail (account activation or password reset), and logs the
 * user in.
 * @param data c1 and c2, the two codes from the link; the new password
 * Who: anyone with a valid link.
 * Returns: { user } (null when the login afterwards failed). Throws with Madoc's message when the
 *   link is invalid or expired, or the password is too weak.
 */
export const setPassword = (data: { c1: string; c2: string; password: string }) =>
  publicPost<{ user: { id: number; name: string } | null }>('/auth/set-password', data);

/**
 * Whether a link to set the password is still valid.
 * @param data c1 and c2, the two codes from the link
 * Who: anyone.
 * Returns: { valid }.
 */
export const checkReset = (data: { c1: string; c2: string }) => publicRequest<{ valid: boolean }>('/auth/check-reset', data);

/**
 * Accepts the site's latest terms for the logged-in user (the terms step after login).
 * Input: none.
 * Who: logged-in user.
 * Returns: nothing.
 */
export const acceptTerms = () => request<void>('/api/madoc/terms/accept', { method: 'POST' });
