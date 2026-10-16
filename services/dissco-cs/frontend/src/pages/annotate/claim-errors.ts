import { ApiError } from '../../api/cs-client/request';

// When a manifest already has its maximum number of volunteers, Madoc refuses the claim with a 400
// and exactly this text (create-resource-claim.ts in madoc-ts). A 400 alone cannot be told apart
// from other errors, hence the text check. If Madoc ever changes the text, the annotate page shows
// its general "could not load" screen instead of "this task is full".
const CONTRIBUTOR_LIMIT_MESSAGE = 'Maximum number of contributors reached';

export function isContributorLimitReached(err: unknown): boolean {
  return err instanceof ApiError && err.status === 400 && err.message === CONTRIBUTOR_LIMIT_MESSAGE;
}
