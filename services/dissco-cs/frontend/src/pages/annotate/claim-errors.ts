import { ApiError } from '../../api/cs-client/request';

// Madoc refuses a claim on a manifest that already has its maximum number of contributors with a
// plain 400 and this fixed text (create-resource-claim.ts in madoc-ts, thrown as a RequestError).
// A 400 alone isn't enough to tell it apart from other validation errors, hence the text match. If
// Madoc ever rewords it, the annotate page falls back to its general "could not load" page.
const CONTRIBUTOR_LIMIT_MESSAGE = 'Maximum number of contributors reached';

export function isContributorLimitReached(err: unknown): boolean {
  return err instanceof ApiError && err.status === 400 && err.message === CONTRIBUTOR_LIMIT_MESSAGE;
}
