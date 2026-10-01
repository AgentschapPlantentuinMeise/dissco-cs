import React, { createContext, useContext, useEffect, useState } from 'react';
import { navItemsApi } from '../api/cs-api';
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

type NavItemsState = {
  loading: boolean;
  isActive: (key: NavItemKey) => boolean;
  getContent: (key: NavItemKey, lang: string) => string | undefined;
  navItems: NavItemDto[];
  refresh: () => void;
};

const defaultState: NavItemsState = {
  loading: true,
  isActive: () => true,
  getContent: () => undefined,
  navItems: DEFAULT_NAV_ITEMS,
  refresh: () => {},
};

const NavItemsContext = createContext<NavItemsState>(defaultState);

export const NavItemsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fetchedNavItems, setFetchedNavItems] = useState<NavItemDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    navItemsApi
      .list()
      .then(res => {
        if (!cancelled) {
          setFetchedNavItems(res.navItems);
        }
      })
      .catch(() => {
        // Fail-open: on error, keep using DEFAULT_NAV_ITEMS so the site behaves as if nothing
        // was ever customized, instead of breaking navigation.
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [version]);

  const navItems = fetchedNavItems ?? DEFAULT_NAV_ITEMS;

  const isActive = (key: NavItemKey) => {
    const item = navItems.find(p => p.page_key === key);
    return item ? item.is_active : true;
  };

  const getContent = (key: NavItemKey, lang: string) => {
    const item = navItems.find(p => p.page_key === key);
    return item?.content[lang as keyof NavItemDto['content']];
  };

  return (
    <NavItemsContext.Provider
      value={{ loading, isActive, getContent, navItems, refresh: () => setVersion(v => v + 1) }}
    >
      {children}
    </NavItemsContext.Provider>
  );
};

export function useNavItems(): NavItemsState {
  return useContext(NavItemsContext);
}
