import { publicPost, publicRequest } from './request';
import { MadocSiteTermsDto, InvitationDto } from '@dissco-cs/shared-types';

// -- dissco-cs auth pages (register/login/forgot-password/set-password) --
export const getInvitation = (code: string) => publicRequest<InvitationDto>('/auth/invitation', { code });
// Existing, unmodified Madoc route - not part of the dissco-cs-auth.ts addition.
export const getTerms = () => publicRequest<{ latest: MadocSiteTermsDto | null }>('/terms');
export const register = (data: { name: string; email: string; capToken: string; code?: string; termsAccepted?: boolean }) =>
  publicPost<{ ok: true; emailSent: boolean }>('/auth/register', data);
export const login = (data: { email: string; password: string }) =>
  publicPost<{ user: { id: number; name: string; hasTerms: boolean; hasAccepted: boolean } }>('/auth/login', data);
export const forgotPassword = (data: { email: string }) => publicPost<{ ok: true }>('/auth/forgot-password', data);
export const setPassword = (data: { c1: string; c2: string; password: string }) =>
  publicPost<{ user: { id: number; name: string } | null }>('/auth/set-password', data);
export const checkReset = (data: { c1: string; c2: string }) => publicRequest<{ valid: boolean }>('/auth/check-reset', data);
