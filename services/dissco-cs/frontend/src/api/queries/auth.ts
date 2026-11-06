import { queryOptions } from '@tanstack/react-query';
import { checkReset, getAccount, getInvitation, getTerms } from '../madoc-auth/auth';

// What the registration and password pages load before showing their form. Madoc answers an
// unknown invitation or link with { expired: true } / { valid: false }, so a failed query is always
// a fault, never an expired link.
export const authKeys = {
  all: ['auth'] as const,
  invitation: (code: string | undefined) => [...authKeys.all, 'invitation', code] as const,
  terms: () => [...authKeys.all, 'terms'] as const,
  account: () => [...authKeys.all, 'account'] as const,
  resetLink: (c1: string, c2: string) => [...authKeys.all, 'reset-link', c1, c2] as const,
};

export const authQueries = {
  invitation: (code: string | undefined) =>
    queryOptions({ queryKey: authKeys.invitation(code), queryFn: () => getInvitation(code!), enabled: !!code }),

  terms: () => queryOptions({ queryKey: authKeys.terms(), queryFn: () => getTerms() }),

  account: () => queryOptions({ queryKey: authKeys.account(), queryFn: () => getAccount() }),

  resetLink: (c1: string, c2: string) =>
    queryOptions({ queryKey: authKeys.resetLink(c1, c2), queryFn: () => checkReset({ c1, c2 }), enabled: !!c1 && !!c2 }),
};
