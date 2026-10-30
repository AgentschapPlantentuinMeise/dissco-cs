import { useTranslation } from 'react-i18next';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { VscMegaphone } from 'react-icons/vsc';
import { useAnnouncements } from './use-announcements';
import { AnnouncementText } from './AnnouncementText';

// The megaphone in the navbar: every announcement that applies here, with a dot while some are new.
// Opening the list counts as having seen them. A popover, not a menu: the list is text without
// menu items. Headless UI closes it on a click outside or Escape.
export function AnnouncementPin() {
  const { t } = useTranslation('dissco-cs');
  const { all, unseenCount, markSeen } = useAnnouncements();

  if (all.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverButton
        onClick={() => markSeen(all)}
        aria-label={t('announcement_pin_label', { count: unseenCount })}
        className={`relative grid place-items-center w-[34px] h-[34px] rounded-full border-none cursor-pointer focus:outline-none data-[focus]:outline data-[focus]:outline-2 data-[focus]:outline-cs-accent ${
          unseenCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-transparent text-gray-500 hover:text-cs-primary'
        }`}
      >
        <VscMegaphone aria-hidden="true" />
        {unseenCount > 0 && (
          <span className="absolute top-[3px] right-[3px] w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-amber-50 box-content" />
        )}
      </PopoverButton>
      <PopoverPanel
        anchor={{ to: 'bottom end', gap: 8 }}
        aria-label={t('announcement_header_title')}
        className="z-[250] w-[340px] max-w-[calc(100vw-32px)] max-h-[70vh] overflow-y-auto bg-white rounded border border-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.16)] focus:outline-none"
      >
        <h2 className="m-0 px-4 pt-3 pb-1.5 text-[0.72rem] font-bold uppercase tracking-[0.06em] text-amber-700">{t('announcement_header_title')}</h2>
        <ul className="list-none m-0 p-0">
          {all.map(announcement => (
            <li key={announcement.id} className="px-4 py-2.5 border-t border-gray-100 text-[0.88rem] text-gray-900">
              <AnnouncementText announcement={announcement} />
            </li>
          ))}
        </ul>
      </PopoverPanel>
    </Popover>
  );
}
