import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuSearch } from 'react-icons/lu';
import { ForumFilter } from './forum-topics';
import { inputClass } from './forum-styles';

const filterRowClass = (isActive: boolean) =>
  'block w-full text-left px-[10px] py-2 rounded-md text-[0.85rem] cursor-pointer transition-colors duration-200 ' +
  (isActive
    ? 'bg-[var(--cs-primary)]/10 text-[var(--cs-primary)] font-semibold'
    : 'text-gray-600 hover:bg-gray-100 hover:text-[var(--cs-primary)]');

const FILTER_LABEL_KEYS: Record<ForumFilter, string> = {
  mine: 'forum_filter_mine',
  unread: 'forum_filter_unread',
  unanswered: 'forum_filter_unanswered',
};

// Search box and filters next to the topic list. Clicking the active filter again clears it.
export function ForumSidebar({ searchQuery, onSearchChange, activeFilter, onFilterChange }: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: ForumFilter | null;
  onFilterChange: React.Dispatch<React.SetStateAction<ForumFilter | null>>;
}) {
  const { t } = useTranslation('dissco-cs');

  return (
    <aside className="order-1 lg:order-2 flex flex-col gap-6 lg:sticky lg:top-[90px]">
      <div className="relative">
        <LuSearch className="absolute left-[11px] top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
        <input
          className={`${inputClass} w-full pl-9 box-border`}
          type="search"
          placeholder={t('forum_search_placeholder')}
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 m-0 mb-3">{t('forum_filters_heading')}</p>
        <div className="flex flex-col gap-1">
          {(['mine', 'unread', 'unanswered'] as const).map(f => (
            <button
              key={f}
              className={filterRowClass(activeFilter === f)}
              onClick={() => onFilterChange(cur => (cur === f ? null : f))}
            >
              {t(FILTER_LABEL_KEYS[f])}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
