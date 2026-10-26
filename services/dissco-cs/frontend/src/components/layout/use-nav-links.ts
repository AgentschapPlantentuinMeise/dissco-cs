import { NavItemKey } from '@dissco-cs/shared-types';
import { useNavItems } from '../../hooks/use-nav-items';
import { useCurrentUser } from '../../hooks/use-current-user';
import { NAV_ITEMS } from './nav-config';

export interface NavLink {
  // A page management key (NavItemKey), or 'projects' for the fixed Projects link.
  key: string;
  labelKey: string;
  href: string;
}

// Which navigation links show: a page switched off in page management is left out, and a page that
// requires login only shows for a logged-in user.
export function useNavLinks() {
  const { isActive } = useNavItems();
  const user = useCurrentUser();

  const isVisible = (key: NavItemKey) => {
    const entry = NAV_ITEMS[key];
    return !!entry && isActive(key) && (!entry.requiresLogin || !!user);
  };

  // The visible links among `keys`, in the order of `keys`.
  const linksFor = (keys: NavItemKey[]): NavLink[] =>
    keys.flatMap(key => {
      const entry = NAV_ITEMS[key];
      return entry && isVisible(key) ? [{ key, labelKey: entry.labelKey, href: entry.href }] : [];
    });

  return { isVisible, linksFor };
}
