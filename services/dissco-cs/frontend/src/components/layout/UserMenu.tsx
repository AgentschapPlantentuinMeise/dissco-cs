import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from '@headlessui/react';
import { LuChevronDown, LuUser } from 'react-icons/lu';
import { reviewQueries } from '../../api/queries/review';
import { feedbackQueries } from '../../api/queries/feedback';
import { HrefLink } from '../../utility/href-link';
import { getSiteSlug } from '../../api/slug';
import { withQuery } from '../../api/url';
import { getCurrentUser } from '../../api/jwt';
import { LANGUAGES } from '../../utility/site-lang-text';
import { changeLanguage } from './change-language';
import { SUPPORT_LINK_KEYS } from './nav-config';
import { useNavLinks } from './use-nav-links';
import { useSiteName } from '../../hooks/use-site-name';
import { menuItemClass, menuItemsClass, menuSeparatorClass, newDotClass } from './nav-styles';

type CurrentUser = NonNullable<ReturnType<typeof getCurrentUser>>;

const firstName = (name: string) => name.trim().split(/\s+/)[0];

// The logged-in user's name and menu: dashboard (with the number of unread feedback threads),
// review and site admin for those roles, profile, help and contact, the site languages, and logout.
export function UserMenu({ user }: { user: CurrentUser }) {
  const { t, i18n } = useTranslation('dissco-cs');
  const platformName = useSiteName();
  const siteSlug = getSiteSlug();
  const { linksFor } = useNavLinks();
  const showAdmin = user.scope.includes('site.admin');
  // Reviewer role is not in the JWT (only scope), so ask a light backend call; admins skip it,
  // they see the link anyway.
  const { data: isReviewer } = useQuery({
    ...reviewQueries.isReviewer(),
    enabled: !showAdmin,
    staleTime: 5 * 60 * 1000,
  });
  const showReview = showAdmin || !!isReviewer;

  // Refreshed by invalidation from the dashboard (no window events).
  const { data: feedbackUnreadCount = 0 } = useQuery({
    ...feedbackQueries.threads(),
    select: threads => threads.reduce((sum, thread) => sum + thread.unreadCount, 0),
  });
  const supportLinks = linksFor(SUPPORT_LINK_KEYS);

  return (
    <Menu>
      <MenuButton
        aria-label={t('nav_account_menu', { name: user.name })}
        className="inline-flex items-center gap-1.5 rounded border-0 bg-transparent px-2 py-1.5 text-[0.9rem] text-gray-600 cursor-pointer hover:text-cs-primary hover:bg-cs-primary/[0.07] data-[open]:text-cs-primary data-[focus]:outline data-[focus]:outline-2 data-[focus]:outline-cs-accent"
      >
        <span className="relative inline-flex">
          <LuUser aria-hidden="true" className="text-[1.15em]" />
          {feedbackUnreadCount > 0 && (
            <span
              role="status"
              aria-label={t('nav_feedback_notification')}
              className={`${newDotClass} absolute -top-1 -right-1 border-2 border-white box-content`}
            />
          )}
        </span>
        {/* Only the icon on a phone, where the bar has no room for a name. */}
        <span className="hidden sm:inline max-w-[140px] truncate">{firstName(user.name)}</span>
        <LuChevronDown aria-hidden="true" className="hidden sm:inline" />
      </MenuButton>
      <MenuItems anchor={{ to: 'bottom end', gap: 8 }} className={`${menuItemsClass} w-[240px]`}>
        <div className="px-4 pt-2 pb-2.5 font-semibold text-gray-900 truncate">{user.name}</div>
        <MenuSeparator className={menuSeparatorClass} />
        <MenuItem>
          <HrefLink href="/my-dashboard" className={menuItemClass}>
            {t('nav_dashboard')}
            {feedbackUnreadCount > 0 && (
              <span className="rounded-full bg-cs-secondary px-1.5 text-[0.7rem] font-bold leading-[1.5] text-white">
                {feedbackUnreadCount}
              </span>
            )}
          </HrefLink>
        </MenuItem>
        {showReview && (
          <MenuItem><HrefLink href="/review" className={menuItemClass}>{t('nav_review')}</HrefLink></MenuItem>
        )}
        {showAdmin && (
          <MenuItem><HrefLink href="/manage" className={menuItemClass}>{t('nav_site_admin')}</HrefLink></MenuItem>
        )}
        <MenuItem><a href={`/s/${siteSlug}/account`} className={menuItemClass}>{t('nav_profile_settings')}</a></MenuItem>
        {supportLinks.length > 0 && <MenuSeparator className={menuSeparatorClass} />}
        {supportLinks.map(link => (
          <MenuItem key={link.key}><HrefLink href={link.href} className={menuItemClass}>{t(link.labelKey, { platformName })}</HrefLink></MenuItem>
        ))}
        <MenuSeparator className={menuSeparatorClass} />
        <div className="flex gap-1 px-4 py-1.5" role="group" aria-label={t('common_tabs_language')}>
          {LANGUAGES.map(lng => (
            <MenuItem key={lng.code}>
              <button
                type="button"
                onClick={() => changeLanguage(i18n, lng.code)}
                aria-label={lng.label}
                className={`rounded border bg-white px-2 py-0.5 text-[0.8rem] font-semibold cursor-pointer data-[focus]:border-cs-primary ${
                  lng.code === i18n.language ? 'border-cs-primary text-cs-primary' : 'border-gray-200 text-gray-500'
                }`}
              >
                {lng.code.toUpperCase()}
              </button>
            </MenuItem>
          ))}
        </div>
        <MenuSeparator className={menuSeparatorClass} />
        <MenuItem>
          <a href={withQuery(`/s/${siteSlug}/logout`, { redirect: `/s/${siteSlug}/` })} className={menuItemClass}>
            {t('nav_logout')}
          </a>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
