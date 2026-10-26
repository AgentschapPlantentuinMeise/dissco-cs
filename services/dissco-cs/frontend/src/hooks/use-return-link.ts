import { useLocation } from 'react-router-dom';
import { backHref, ReturnState } from '../utility/back-href';

// A link to a detail page passes the current location along (useReturnState), so the detail
// page's back link can return to the overview as the user left it, e.g. on page 3 (useBackHref).

/** The current location as link state, for a link from an overview to a detail page. */
export function useReturnState(): ReturnState {
  const { pathname, search } = useLocation();
  return { from: { pathname, search } };
}

/** The href of a detail page's link back to its overview, see backHref. */
export function useBackHref(overviewPath: string): string {
  return backHref(useLocation().state, overviewPath);
}
