import { useQuery, useQueryClient } from '@tanstack/react-query';
import { navItemKeys, navItemQueries } from '../api/queries/nav-items';
import { failedToLoad } from '../api/query-state';
import { NavItemDto, NavItemKey, NAV_ITEM_KEYS } from '@dissco-cs/shared-types';

// Used before the first fetch resolves (or if it fails) — fail-open, in the default order,
// so the navbar never flashes empty/incomplete while loading.
const DEFAULT_NAV_ITEMS: NavItemDto[] = NAV_ITEM_KEYS.map((key, sortOrder) => ({
  pageKey: key,
  isActive: true,
  content: {},
  intro: {},
  showContactForm: true,
  sortOrder: sortOrder,
}));

// Every caller shares the same query cache entry, so this is still one request per site load.
export function useNavItems() {
  const queryClient = useQueryClient();
  const query = useQuery(navItemQueries.list());
  const { data, isPending, errorUpdateCount } = query;

  // Fail-open: while loading or on error, keep using DEFAULT_NAV_ITEMS so the site behaves as if
  // nothing was ever customized, instead of breaking navigation. A screen that edits the pages
  // must check isError instead: the defaults would show real texts as empty.
  const navItems = data ?? DEFAULT_NAV_ITEMS;

  const isActive = (key: NavItemKey) => {
    const item = navItems.find(p => p.pageKey === key);
    return item ? item.isActive : true;
  };

  const getContent = (key: NavItemKey, lang: string) => {
    const item = navItems.find(p => p.pageKey === key);
    return item?.content[lang as keyof NavItemDto['content']];
  };

  const getIntro = (key: NavItemKey, lang: string) => {
    const item = navItems.find(p => p.pageKey === key);
    return item?.intro[lang as keyof NavItemDto['intro']];
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: navItemKeys.all });

  // Only the very first load counts as loading. A failed query without data goes back to pending on
  // every retry, and every component that mounts useNavItems starts one. PageGate would then hide
  // the page, the page would mount again, and so on: an endless white screen while the backend is down.
  const loading = isPending && errorUpdateCount === 0;

  return { loading, isError: failedToLoad(query), isActive, getContent, getIntro, navItems, refresh };
}
