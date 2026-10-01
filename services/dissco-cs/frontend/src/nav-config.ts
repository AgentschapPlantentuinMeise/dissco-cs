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
  forum: { labelKey: 'nav_messageboard', href: '/messageboard', requiresLogin: true },
  about: { labelKey: 'nav_about', href: '/about' },
  help: { labelKey: 'nav_help', href: '/help' },
  contact: { labelKey: 'nav_contact', href: '/contact' },
};
