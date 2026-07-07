import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { Announcement, announcementsApi, AnnouncementTargetType } from '../../api/cs-api';

const DISMISSED_KEY_PREFIX = 'cs-announcement-dismissed-';

function isDismissed(id: Announcement['id']): boolean {
  return window.localStorage.getItem(`${DISMISSED_KEY_PREFIX}${id}`) === '1';
}

function dismiss(id: Announcement['id']): void {
  window.localStorage.setItem(`${DISMISSED_KEY_PREFIX}${id}`, '1');
}

export const AnnouncementBanner: React.FC<{ target: AnnouncementTargetType; projectSlug?: string }> = ({
  target,
  projectSlug,
}) => {
  const { t } = useTranslation('dissco-cs');
  const { data } = useQuery(['active-announcements', target, projectSlug], () =>
    announcementsApi.listActive(target, projectSlug)
  );
  const [dismissedIds, setDismissedIds] = useState<Announcement['id'][]>([]);

  const announcements = data?.announcements ?? [];
  const visible = announcements.filter(a => !dismissedIds.includes(a.id) && !isDismissed(a.id));

  useEffect(() => {
    setDismissedIds([]);
  }, [target, projectSlug]);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 mt-6 mb-6">
      {visible.map(announcement => (
        <div
          key={announcement.id}
          role="status"
          className="relative flex items-start gap-3 rounded-lg border-l-4 border-[var(--cs-secondary)] bg-[var(--cs-light,#f3f8f8)] py-3 pl-4 pr-10 shadow-[0_1px_4px_rgba(0,0,0,0.07)]"
        >
          <div>
            <p className="font-semibold text-[var(--cs-primary)] m-0">{announcement.title}</p>
            <p className="text-sm text-gray-700 mt-1 mb-0">{announcement.description}</p>
          </div>
          <button
            onClick={() => {
              dismiss(announcement.id);
              setDismissedIds(prev => [...prev, announcement.id]);
            }}
            aria-label={t('announcement_dismiss')}
            className="absolute top-2 right-2 bg-transparent border-none cursor-pointer text-gray-500 hover:text-gray-800 text-lg leading-none p-1"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
