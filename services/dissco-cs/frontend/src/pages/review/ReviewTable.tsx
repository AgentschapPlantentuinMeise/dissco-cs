import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronIcon } from '../../icons/ChevronIcon';
import { EyeIcon } from '../../icons/EyeIcon';
import { ReviewTaskRow } from '../../api/cs-api';
import { localeText } from '../../utility/locale-text';
import { SortKey, SortDir } from './useReviewTasksController';
import { reviewStatusKey, STATUS_BADGE_CLASSES, badgeClass, thClass, tdClass } from './review-table-styles';

interface ReviewTableProps {
  visibleRows: ReviewTaskRow[];
  sortKey: SortKey;
  sortDir: SortDir;
  toggleSort: (key: SortKey) => void;
  allVisibleSelected: boolean;
  toggleSelectAllVisible: () => void;
  selectedIds: Set<string>;
  toggleSelectRow: (id: string) => void;
  isOwnTask: (row: ReviewTaskRow) => boolean;
  filterBySubmitter: (name: string) => void;
  onPreview: (row: ReviewTaskRow) => void;
  openRowId: string | null;
  onRowClick: (row: ReviewTaskRow) => void;
  /** Rendert een extra rij vlak onder de aangeklikte rij (inline-uitklap-weergave). */
  renderRowExpansion?: (row: ReviewTaskRow) => React.ReactNode;
}

export function ReviewTable({
  visibleRows,
  sortKey,
  sortDir,
  toggleSort,
  allVisibleSelected,
  toggleSelectAllVisible,
  selectedIds,
  toggleSelectRow,
  isOwnTask,
  filterBySubmitter,
  onPreview,
  openRowId,
  onRowClick,
  renderRowExpansion,
}: ReviewTableProps) {
  const { t, i18n } = useTranslation('dissco-cs');

  const sortIndicator = (key: SortKey) => (
    <ChevronIcon
      aria-hidden="true"
      className={`inline-block ml-1 transition-transform ${sortKey === key ? 'opacity-100' : 'opacity-0'} ${
        sortKey === key && sortDir === 'desc' ? 'rotate-180' : ''
      }`}
    />
  );

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="text-left text-[0.7rem] uppercase tracking-wide text-gray-400">
          <th className="px-4 py-3 w-8">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} aria-label={t('review_bulk_select_all')} />
          </th>
          <th className={thClass} onClick={() => toggleSort('project')}>
            {t('review_col_project')}{sortIndicator('project')}
          </th>
          <th className={thClass} onClick={() => toggleSort('subject')}>
            {t('review_col_subject')}{sortIndicator('subject')}
          </th>
          <th className={thClass} onClick={() => toggleSort('status')}>
            {t('review_col_status')}{sortIndicator('status')}
          </th>
          <th className={thClass} onClick={() => toggleSort('submitter')}>
            {t('review_col_submitter')}{sortIndicator('submitter')}
          </th>
          <th className={thClass} onClick={() => toggleSort('reviewer')}>
            {t('review_col_reviewer')}{sortIndicator('reviewer')}
          </th>
          <th className={thClass} onClick={() => toggleSort('modified_at')}>
            {t('review_col_modified')}{sortIndicator('modified_at')}
          </th>
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody>
        {visibleRows.map((row: ReviewTaskRow) => {
          const projectLabel = localeText(row.project.label, i18n.language) || row.project.slug || '—';
          const subjectLabel = localeText(row.subject.label, i18n.language) || row.id;
          const modified = row.modified_at ? new Date(row.modified_at).toLocaleString(i18n.language) : '—';
          const canPreview = !!row.subject_raw;
          const selectable = isOwnTask(row);
          const isOpen = openRowId === row.id;

          return (
            <React.Fragment key={row.id}>
              <tr
                data-row-id={row.id}
                onClick={() => onRowClick(row)}
                className={`cursor-pointer border-l-4 ${isOpen ? 'bg-gray-50 border-l-[var(--cs-primary)]' : 'border-l-transparent'}`}
              >
                <td className={tdClass} onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.id)}
                    onChange={() => toggleSelectRow(row.id)}
                    disabled={!selectable}
                    title={selectable ? undefined : t('review_not_own_task')}
                    aria-label={subjectLabel}
                  />
                </td>
                <td className={tdClass}>{projectLabel}</td>
                <td className={tdClass}>{subjectLabel}</td>
                <td className={tdClass}>
                  <span className={`${badgeClass} ${STATUS_BADGE_CLASSES[row.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {t(reviewStatusKey(row.status))}
                  </span>
                </td>
                <td className={tdClass} onClick={e => e.stopPropagation()}>
                  {row.submitter ? (
                    <button
                      onClick={() => filterBySubmitter(row.submitter as string)}
                      className="bg-transparent border-none p-0 text-[var(--cs-primary)] cursor-pointer hover:underline"
                    >
                      {row.submitter}
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
                <td className={`${tdClass} ${row.status === 2 ? 'font-semibold text-gray-900' : ''}`}>{row.reviewer ?? '—'}</td>
                <td className={tdClass}>{modified}</td>
                <td className={`${tdClass} text-right`} onClick={e => e.stopPropagation()}>
                  {canPreview && (
                    <button
                      onClick={() => onPreview(row)}
                      aria-label={t('review_view_image')}
                      title={t('review_view_image')}
                      className="bg-transparent border-none text-gray-400 cursor-pointer hover:text-[var(--cs-primary)] p-1"
                    >
                      <EyeIcon />
                    </button>
                  )}
                </td>
              </tr>
              {renderRowExpansion && isOpen && (
                <tr data-expansion-row-id={row.id}>
                  <td colSpan={8} className="p-0">
                    {renderRowExpansion(row)}
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
