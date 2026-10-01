import { MultilingualText } from './common.js';

// Order here is the default display order (navbar + page management) for sites that
// haven't customized it yet — see `sort_order` on the `site_pages` table.
export const SITE_PAGE_KEYS = ['institutions', 'forum', 'about', 'help', 'contact', 'welcome'] as const;
export type SitePageKey = (typeof SITE_PAGE_KEYS)[number];

export const SITE_PAGE_CONTENT_KEYS = ['about', 'help', 'contact', 'welcome'] as const;
export type SitePageContentKey = (typeof SITE_PAGE_CONTENT_KEYS)[number];

// Wire shape (dates as ISO strings). The API repository keeps its own local `SitePage` row
// type with `updated_at: Date` for internal use; route handlers send this shape.
export type SitePage = {
  site_id: number;
  page_key: SitePageKey;
  is_active: boolean;
  content: MultilingualText;
  contact_email: string | null;
  show_contact_form: boolean;
  sort_order: number;
  updated_at: string;
};
