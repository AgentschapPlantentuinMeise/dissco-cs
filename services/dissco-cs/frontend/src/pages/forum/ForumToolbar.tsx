import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuSearch, LuX } from 'react-icons/lu';
import { IconButton } from '../../components/ui/IconButton';
import { FORUM_FILTERS, ForumFilter } from '../../components/forum/forum-topics';
import { inputClass } from '../../components/ui/input-styles';

const FILTER_LABEL_KEYS: Record<ForumFilter, string> = {
  mine: 'forum_filter_mine',
  unread: 'forum_filter_unread',
  unanswered: 'forum_filter_unanswered',
};

// Only the filters where a number helps: how much is new or still waiting for an answer.
const COUNTED: ForumFilter[] = ['unread', 'unanswered'];

const tabClass = (isActive: boolean) =>
  `flex w-full items-center justify-between gap-1.5 px-3 py-2 rounded border-none text-left text-[0.86rem] cursor-pointer transition-colors duration-200 ${
    isActive ? 'bg-cs-primary/10 text-cs-primary font-semibold' : 'bg-transparent text-gray-600 hover:text-cs-primary'
  }`;

// Search box and filters in the column next to the topic list (above it on a small screen). The
// project filter only shows when a link set it (a project page's "all questions").
export function ForumToolbar({ searchQuery, onSearchChange, activeFilter, onFilterChange, counts, projectLabel, onClearProject }: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: ForumFilter | null;
  onFilterChange: React.Dispatch<React.SetStateAction<ForumFilter | null>>;
  counts: Record<ForumFilter, number>;
  projectLabel: string | null;
  onClearProject: () => void;
}) {
  const { t } = useTranslation('dissco-cs');

  return (
    <aside className="flex flex-col gap-5 xl:sticky xl:top-[calc(theme(spacing.navbar)+1.5rem)]">
      {projectLabel && (
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-wider text-gray-500 m-0 mb-2">{t('forum_project_filter_heading')}</p>
          <span className="flex items-center justify-between gap-1.5 pl-3 pr-1 py-1 rounded bg-cs-primary/10 text-cs-primary text-[0.86rem] font-semibold">
            <span className="min-w-0 truncate">{projectLabel}</span>
            <IconButton icon={LuX} label={t('forum_project_filter_clear')} onClick={onClearProject} />
          </span>
        </div>
      )}

      <div className="relative">
        <LuSearch className="absolute left-[11px] top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
        <input
          className={`${inputClass} w-full pl-9 box-border bg-white`}
          type="search"
          placeholder={t('forum_search_placeholder')}
          aria-label={t('forum_search_placeholder')}
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

      <div>
        <p className="text-[0.7rem] font-bold uppercase tracking-wider text-gray-500 m-0 mb-2">{t('forum_filters_heading')}</p>
        <div className="flex flex-col gap-0.5" role="group" aria-label={t('forum_filters_heading')}>
          <button type="button" aria-pressed={activeFilter === null} className={tabClass(activeFilter === null)} onClick={() => onFilterChange(null)}>
            {t('forum_filter_all')}
          </button>
          {FORUM_FILTERS.map(filter => (
            <button
              type="button"
              key={filter}
              aria-pressed={activeFilter === filter}
              className={tabClass(activeFilter === filter)}
              onClick={() => onFilterChange(filter)}
            >
              {t(FILTER_LABEL_KEYS[filter])}
              {COUNTED.includes(filter) && counts[filter] > 0 && (
                <span className="text-[0.72rem] font-bold text-cs-primary bg-white rounded-full px-[7px]">{counts[filter]}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
