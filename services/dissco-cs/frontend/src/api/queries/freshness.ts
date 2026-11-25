// How long each kind of data counts as fresh. While it is fresh, react-query serves it from the
// cache: showing a page again or returning to the browser tab fetches nothing. The cache lives per
// browser tab, so the staleTime is also the longest another user's change takes to show up in a tab
// that is already open. A user's own change shows at once: invalidateQueries refetches whatever the
// staleTime. Every query factory in api/queries/ picks one of these; SLOW is the default.

/** Changes now and then (project lists, a project): the default, set in query-client.ts. */
export const SLOW = { staleTime: 60 * 1000 } as const;

/** Changes only when a site admin edits it (theme, menu, institutions, manuals). */
export const STATIC = { staleTime: 5 * 60 * 1000 } as const;

/** Changes all the time (unread counters, task lists): fetched each time it is shown and on every return to the tab. */
export const LIVE = { staleTime: 0 } as const;

/**
 * Never changes for the same id (a canvas, a manifest), or is a one-time check whose answer
 * changes once it is used (an invitation, a password reset link): a refetch would only swap the
 * page for "expired" after the user acted on it.
 */
export const FIXED_PER_ID = { staleTime: Infinity } as const;

/**
 * Builds a form the user is filling in. A refetch that brings changed data sets the form up again,
 * empty, so it never refetches on its own. It is dropped from the cache as soon as nobody shows it
 * (gcTime 0), so opening it again still loads it afresh.
 */
export const FROZEN_UNTIL_LEFT = { staleTime: Infinity, gcTime: 0 } as const;
