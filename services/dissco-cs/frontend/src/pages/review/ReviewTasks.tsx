import React from 'react';
import { CsPage } from '../../components/CsPage';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ChevronIcon } from '../../icons/ChevronIcon';
import { localeText } from '../../utility/locale-text';
import { ImagePreviewPopup } from '../../components/ImagePreviewPopup';
import { ReviewCountSummary } from './ReviewCountSummary';
import { ReviewInlineExpansion } from './ReviewInlineExpansion';
import { ReviewSearchInput } from './ReviewSearchInput';
import { ReviewTable } from './ReviewTable';
import { useReviewTasksController } from './useReviewTasksController';

// De tabel verandert nooit van breedte of positie -- een aangeklikte rij klapt zelf open met de
// velden in een responsieve grid (zie ReviewInlineExpansion).
export const ReviewTasks: React.FC = () => {
  const c = useReviewTasksController();
  const { t, i18n } = c;

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide">
          <h1 className="text-3xl text-[var(--cs-primary)] mt-4 mb-6">{t('review_title')}</h1>

          <div className="flex flex-wrap items-center gap-3 mb-5">
            <ReviewSearchInput value={c.searchQuery} onChange={c.setSearchQuery} />
            <div className="relative">
              <select
                value={c.statusFilter}
                onChange={e => c.setStatusFilter(e.target.value as '' | '0' | '1' | '2')}
                className="appearance-none border border-gray-300 rounded-lg p-2 pr-8"
              >
                <option value="">{t('review_filter_status_all')}</option>
                <option value="0">{t('review_status_not_started')}</option>
                <option value="1">{t('review_status_todo')}</option>
                <option value="2">{t('review_status_in_review')}</option>
              </select>
              <ChevronIcon aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            {c.queryStatus === 'success' && (
              <ReviewCountSummary visibleCount={c.visibleRows.length} totalCount={c.rows.length} className="ml-auto" />
            )}
          </div>

          {c.selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600">{t('review_bulk_selected_count', { count: c.selectedIds.size })}</span>
              <button
                onClick={() => c.setConfirmingAccept(true)}
                disabled={c.bulkRunning}
                className="px-4 py-2 rounded-full text-sm font-semibold border-none bg-[var(--cs-primary)] text-white cursor-pointer hover:bg-[var(--cs-dark)] disabled:opacity-50"
              >
                {t('review_bulk_accept_button')}
              </button>
            </div>
          )}

          {c.bulkRunning && (
            <p className="text-sm text-gray-500 mb-4">
              {t('review_bulk_progress', { current: c.bulkProgress.current, total: c.bulkProgress.total })}
            </p>
          )}

          {c.bulkResults && (
            <div className="mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-700 m-0">
                  {t('review_bulk_results_summary', { success: c.successCount, failed: c.failedResults.length })}
                </p>
                <button
                  onClick={() => c.setBulkResults(null)}
                  className="text-sm text-[var(--cs-primary)] bg-transparent border-none cursor-pointer hover:underline"
                >
                  {t('common_close')}
                </button>
              </div>
              {c.failedResults.length > 0 && (
                <ul className="mt-2 mb-0 pl-4 text-sm text-red-700 space-y-1">
                  {c.failedResults.map(r => (
                    <li key={r.id}>
                      {r.label}: {r.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {c.queryStatus === 'loading' && <p className="text-sm text-gray-500">{t('review_loading')}</p>}

          {c.queryStatus === 'success' && c.rows.length === 0 && (
            <p className="text-sm text-gray-500">{t('review_empty')}</p>
          )}

          {c.queryStatus === 'success' && c.rows.length > 0 && (
            <div className="bg-white border-t border-gray-200">
              <ReviewTable
                visibleRows={c.visibleRows}
                sortKey={c.sortKey}
                sortDir={c.sortDir}
                toggleSort={c.toggleSort}
                allVisibleSelected={c.allVisibleSelected}
                toggleSelectAllVisible={c.toggleSelectAllVisible}
                selectedIds={c.selectedIds}
                toggleSelectRow={c.toggleSelectRow}
                isOwnTask={c.isOwnTask}
                filterBySubmitter={c.filterBySubmitter}
                onPreview={c.setPreviewRow}
                openRowId={c.openRowId}
                onRowClick={row => c.setOpenRowId(id => (id === row.id ? null : row.id))}
                renderRowExpansion={row => (
                  <ReviewInlineExpansion
                    row={row}
                    editedDocument={c.editedDocuments[row.id]}
                    onDocumentChange={c.handleDocumentChange}
                    onAccept={() => void c.handleSingleAccept(row)}
                    accepting={c.singleAccepting === row.id}
                    onRelease={() => void c.handleRelease(row)}
                    releasing={c.releasing === row.id}
                    releaseError={c.releaseError}
                    onClose={() => c.setOpenRowId(null)}
                    error={c.singleAcceptError}
                  />
                )}
              />
            </div>
          )}
        </div>
      </div>

      {c.confirmingAccept && (
        <ConfirmDialog
          title={t('review_bulk_accept_confirm_title')}
          message={t('review_bulk_accept_confirm', { count: c.selectedIds.size })}
          confirmLabel={t('review_bulk_accept_button')}
          cancelLabel={t('common_cancel')}
          tone="affirm"
          onConfirm={() => void c.runBulkAccept()}
          onCancel={() => c.setConfirmingAccept(false)}
        />
      )}

      {c.previewRow?.subject_raw && (
        <ImagePreviewPopup
          subject={c.previewRow.subject_raw}
          label={localeText(c.previewRow.subject.label, i18n.language) || c.previewRow.id}
          onClose={() => c.setPreviewRow(null)}
        />
      )}
    </CsPage>
  );
};
