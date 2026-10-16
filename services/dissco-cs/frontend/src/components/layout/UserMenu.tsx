import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useDropdownMenu from 'react-accessible-dropdown-menu-hook';
import { stringify } from 'query-string';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { reviewQueries } from '../../api/queries/review';
import { feedbackQueries } from '../../api/queries/feedback';
import { HrefLink } from '../../utility/href-link';
import { LuChevronDown, LuUser } from 'react-icons/lu';
import { getSiteSlug } from '../../api/slug';
import { getCurrentUser } from '../../api/jwt';
import { dropdownItemClass, dropdownListClass } from './nav-styles';

type CurrentUser = NonNullable<ReturnType<typeof getCurrentUser>>;

// The logged-in user's dropdown: dashboard (with the unread feedback badge), profile, review and
// site admin when the user has that role, and logout.
export const UserMenu: React.FC<{ user: CurrentUser }> = ({ user }) => {
  const { t } = useTranslation('dissco-cs');
  const siteSlug = getSiteSlug();
  const location = useLocation();
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

  // The dropdown hook needs a fixed index per item; review and site admin are optional.
  const dropdownCount = 3 + (showReview ? 1 : 0) + (showAdmin ? 1 : 0);
  const { buttonProps, itemProps, isOpen, setIsOpen } = useDropdownMenu(dropdownCount);
  const idxReview = showReview ? 2 : -1;
  const idxSiteAdmin = showAdmin ? 2 + (showReview ? 1 : 0) : -1;
  const idxLogout = 2 + (showReview ? 1 : 0) + (showAdmin ? 1 : 0);

  useEffect(() => {
    setIsOpen(false);
  }, [location, setIsOpen]);

  return (
    <div className="relative">
      <button
        className="bg-transparent border-none cursor-pointer text-gray-600 font-[380] text-base flex items-center gap-1 p-0 hover:text-[var(--cs-primary)] transition-colors duration-200 max-[768px]:py-[10px] max-[768px]:border-t max-[768px]:border-[#f0f0f0] max-[768px]:w-full"
        {...buttonProps}
      >
        <span className="relative inline-flex">
          <LuUser style={{ fontSize: '1.2em', flexShrink: 0 }} />
          {feedbackUnreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex w-[9px] h-[9px]"
              role="status"
              aria-label={t('nav_feedback_notification')}
            >
              <span
                className="motion-safe:animate-ping absolute inline-flex w-full h-full rounded-full opacity-75"
                style={{ background: 'var(--cs-tertiary)' }}
              />
              <span
                className="relative inline-flex w-[9px] h-[9px] rounded-full border border-white"
                style={{ background: 'var(--cs-tertiary)' }}
              />
            </span>
          )}
        </span>
        {user.name} <LuChevronDown aria-hidden="true" />
      </button>
      <ul className={dropdownListClass(isOpen, 'top-[calc(100%+10px)] min-w-[200px]')} role="menu">
        <li>
          <HrefLink href="/my-dashboard" className={dropdownItemClass} {...itemProps[0]}>
            {t('nav_dashboard')}
            {feedbackUnreadCount > 0 && (
              <span
                className="inline-block text-white rounded-[10px] px-[6px] py-[1px] text-[0.7rem] font-bold ml-[5px] align-middle leading-[1.4]"
                style={{ background: 'var(--cs-tertiary)' }}
              >
                {feedbackUnreadCount}
              </span>
            )}
          </HrefLink>
        </li>
        <li><a href={`/s/${siteSlug}/account`} className={dropdownItemClass} {...itemProps[1]}>{t('nav_profile_settings')}</a></li>
        {showReview && (
          <li><HrefLink href="/review" className={dropdownItemClass} {...itemProps[idxReview]}>{t('nav_review')}</HrefLink></li>
        )}
        {showAdmin && (
          <li><HrefLink href="/manage" className={dropdownItemClass} {...itemProps[idxSiteAdmin]}>{t('nav_site_admin')}</HrefLink></li>
        )}
        <li className="border-t border-[#eee] mt-1 pt-1">
          <a
            href={`/s/${siteSlug}/logout?${stringify({ redirect: `/s/${siteSlug}/` })}`}
            className={dropdownItemClass}
            {...itemProps[idxLogout]}
          >
            {t('nav_logout')}
          </a>
        </li>
      </ul>
    </div>
  );
};
