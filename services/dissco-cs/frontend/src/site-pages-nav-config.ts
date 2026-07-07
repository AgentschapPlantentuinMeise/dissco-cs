import { SitePageKey } from './api/cs-api';

type SitePageNavEntry = {
  labelKey: string;
  href: string;
  /** Only shown to logged-in users, regardless of the page's active toggle. */
  requiresLogin?: boolean;
};

export const SITE_PAGE_NAV: Record<SitePageKey, SitePageNavEntry> = {
  institutions: { labelKey: 'nav_institutions', href: '/institutions' },
  forum: { labelKey: 'nav_messageboard', href: '/messageboard', requiresLogin: true },
  about: { labelKey: 'nav_about', href: '/about' },
  help: { labelKey: 'nav_help', href: '/help' },
  contact: { labelKey: 'nav_contact', href: '/contact' },
};
