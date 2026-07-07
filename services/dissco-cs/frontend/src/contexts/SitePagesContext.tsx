import React, { createContext, useContext, useEffect, useState } from 'react';
import { sitePagesApi, SitePage, SitePageKey, SITE_PAGE_KEYS } from '../api/cs-api';

// Used before the first fetch resolves (or if it fails) — fail-open, in the default order,
// so the navbar never flashes empty/incomplete while loading.
const DEFAULT_PAGES: SitePage[] = SITE_PAGE_KEYS.map((key, sortOrder) => ({
  site_id: 0,
  page_key: key,
  is_active: true,
  content: {},
  contact_email: null,
  show_contact_form: true,
  sort_order: sortOrder,
  updated_at: '',
}));

type SitePagesState = {
  loading: boolean;
  isActive: (key: SitePageKey) => boolean;
  getContent: (key: SitePageKey, lang: string) => string | undefined;
  pages: SitePage[];
  refresh: () => void;
};

const defaultState: SitePagesState = {
  loading: true,
  isActive: () => true,
  getContent: () => undefined,
  pages: DEFAULT_PAGES,
  refresh: () => {},
};

const SitePagesContext = createContext<SitePagesState>(defaultState);

export const SitePagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fetchedPages, setFetchedPages] = useState<SitePage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    sitePagesApi
      .list()
      .then(res => {
        if (!cancelled) {
          setFetchedPages(res.pages);
        }
      })
      .catch(() => {
        // Fail-open: on error, keep using DEFAULT_PAGES so the site behaves as if nothing
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

  const pages = fetchedPages ?? DEFAULT_PAGES;

  const isActive = (key: SitePageKey) => {
    const page = pages.find(p => p.page_key === key);
    return page ? page.is_active : true;
  };

  const getContent = (key: SitePageKey, lang: string) => {
    const page = pages.find(p => p.page_key === key);
    return page?.content[lang as keyof SitePage['content']];
  };

  return (
    <SitePagesContext.Provider
      value={{ loading, isActive, getContent, pages, refresh: () => setVersion(v => v + 1) }}
    >
      {children}
    </SitePagesContext.Provider>
  );
};

export function useSitePages(): SitePagesState {
  return useContext(SitePagesContext);
}
