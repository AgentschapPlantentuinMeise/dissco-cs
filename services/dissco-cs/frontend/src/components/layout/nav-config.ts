import { NavItemKey } from '@dissco-cs/shared-types';

type NavItemEntry = {
  labelKey: string;
  href: string;
  /** Only shown to logged-in users, regardless of the item's active toggle. */
  requiresLogin?: boolean;
};

// Partial: not every item key (e.g. 'welcome', which is a one-off modal, not a navbar entry)
// has a navbar entry.
export const NAV_ITEMS: Partial<Record<NavItemKey, NavItemEntry>> = {
  institutions: { labelKey: 'nav_institutions', href: '/institutions' },
  forum: { labelKey: 'nav_forum', href: '/forum', requiresLogin: true },
  about: { labelKey: 'nav_about', href: '/about' },
  help: { labelKey: 'nav_help', href: '/help' },
  contact: { labelKey: 'nav_contact', href: '/contact' },
};

// The links in the bar, after Projects: only pages with a split-banner header, so clicking through
// them never jumps between a tall and a low header. The forum sits with the tools on the right,
// help and contact in the account menu and the footer.
export const BAR_LINK_KEYS: NavItemKey[] = ['institutions', 'about'];
export const SUPPORT_LINK_KEYS: NavItemKey[] = ['help', 'contact'];
