// The place a link came from, passed along as react-router's location state (useReturnState).
export interface ReturnState {
  from: { pathname: string; search: string };
}

function isReturnState(state: unknown): state is ReturnState {
  const from = (state as ReturnState | null)?.from;
  return typeof from?.pathname === 'string' && typeof from?.search === 'string';
}

/**
 * Where a "back to the overview" link goes: the overview as the user left it (e.g. its page),
 * when they came from there; otherwise the overview itself.
 * @param state react-router's location state of the detail page (unknown: anything can be in it)
 * @param overviewPath the overview the link belongs to, e.g. '/explore'
 * Returns: the overview's path, with the query string the user had on it when they came from it.
 */
export function backHref(state: unknown, overviewPath: string): string {
  if (isReturnState(state) && state.from.pathname === overviewPath) {
    return overviewPath + state.from.search;
  }
  return overviewPath;
}
