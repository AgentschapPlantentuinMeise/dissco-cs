import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuChevronLeft, LuChevronRight, LuMegaphone, LuX } from 'react-icons/lu';
import { useAnnouncements } from './use-announcements';
import { AnnouncementText } from './AnnouncementText';
import { IconButton } from '../ui/IconButton';

const pagerButtonClass =
  'inline-grid place-items-center w-[26px] h-[26px] rounded border border-amber-300 bg-transparent text-amber-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

// New announcements of the current page, as a strip right below the navbar. Clicking it away marks
// them as seen; they stay available under the megaphone in the navbar.
export function AnnouncementStrip() {
  const { t } = useTranslation('dissco-cs');
  const { pageNew, markSeen } = useAnnouncements();
  const [index, setIndex] = useState(0);

  if (pageNew.length === 0) {
    return null;
  }

  const current = Math.min(index, pageNew.length - 1);

  return (
    <div role="status" className="bg-amber-50 border-b border-amber-200 text-amber-900">
      <div className="cs-container cs-container--wide py-2.5 flex items-center gap-3 text-[0.9rem]">
        <LuMegaphone aria-hidden="true" className="flex-shrink-0 text-amber-700" />
        <div className="flex-1 min-w-0">
          <AnnouncementText announcement={pageNew[current]} inline />
        </div>
        {pageNew.length > 1 && (
          <div className="flex items-center gap-2 text-[0.8rem] text-amber-800 flex-shrink-0">
            <button type="button" className={pagerButtonClass} onClick={() => setIndex(current - 1)} disabled={current === 0} aria-label={t('announcement_previous')}>
              <LuChevronLeft aria-hidden="true" />
            </button>
            {t('announcement_position', { current: current + 1, total: pageNew.length })}
            <button type="button" className={pagerButtonClass} onClick={() => setIndex(current + 1)} disabled={current === pageNew.length - 1} aria-label={t('announcement_next')}>
              <LuChevronRight aria-hidden="true" />
            </button>
          </div>
        )}
        <IconButton icon={LuX} label={t('announcement_dismiss')} onClick={() => markSeen(pageNew)} className="flex-shrink-0" />
      </div>
    </div>
  );
}
