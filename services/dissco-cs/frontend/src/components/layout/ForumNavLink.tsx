import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { forumQueries } from '../../api/queries/forum';
import { HrefLink } from '../../utility/href-link';
import { newDotClass } from './nav-styles';

// The forum among the tools on the right of the navbar: plain text like the page links, with a dot
// while there are unread messages. The number itself is on the forum page (filter "Unread").
export function ForumNavLink() {
  const { t } = useTranslation('dissco-cs');
  const location = useLocation();
  // Refreshed by invalidation from the forum page (no window events).
  const { data: unreadCount = 0 } = useQuery(forumQueries.unreadCount());
  const isCurrent = location.pathname.startsWith('/forum');

  return (
    <HrefLink
      href="/forum"
      aria-current={isCurrent ? 'page' : undefined}
      className={`inline-flex items-center gap-1 text-[0.92rem] no-underline transition-colors duration-150 hover:text-cs-primary ${
        isCurrent ? 'text-cs-primary font-semibold' : 'text-gray-500'
      }`}
    >
      {t('nav_forum')}
      {unreadCount > 0 && (
        <span className={`${newDotClass} self-start mt-0.5`} role="status" aria-label={t('nav_forum_unread')} />
      )}
    </HrefLink>
  );
}
