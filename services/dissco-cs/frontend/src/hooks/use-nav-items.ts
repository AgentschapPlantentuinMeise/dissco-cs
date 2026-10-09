import { useQuery, useQueryClient } from '@tanstack/react-query';
import { navItemKeys, navItemQueries } from '../api/queries/nav-items';
import { NavItemDto, NavItemKey, NAV_ITEM_KEYS } from '@dissco-cs/shared-types';

// Used before the first fetch resolves (or if it fails) — fail-open, in the default order,
// so the navbar never flashes empty/incomplete while loading.
const DEFAULT_NAV_ITEMS: NavItemDto[] = NAV_ITEM_KEYS.map((key, sortOrder) => ({
  site_id: 0,
  page_key: key,
  is_active: true,
  content: {},
  contact_email: null,
  show_contact_form: true,
  sort_order: sortOrder,
  updated_at: '',
}));

// Every caller shares the same query cache entry, so this is still one request per site load.
export function useNavItems() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(navItemQueries.list());

  // Fail-open: while loading or on error, keep using DEFAULT_NAV_ITEMS so the site behaves as if
  // nothing was ever customized, instead of breaking navigation.
  const navItems = data?.navItems ?? DEFAULT_NAV_ITEMS;

  const isActive = (key: NavItemKey) => {
    const item = navItems.find(p => p.page_key === key);
    return item ? item.is_active : true;
  };

  const getContent = (key: NavItemKey, lang: string) => {
    const item = navItems.find(p => p.page_key === key);
    return item?.content[lang as keyof NavItemDto['content']];
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: navItemKeys.all });

  return { loading: isPending, isActive, getContent, navItems, refresh };
}
