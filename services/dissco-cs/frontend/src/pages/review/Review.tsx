import { CsPage } from '../../components/layout/CsPage';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Select } from '../../components/ui/Select';
import { LuMail } from 'react-icons/lu';
import { localeText } from '../../utility/locale-text';
import { ImagePreviewPopup } from '../../components/iiif/ImagePreviewPopup';
import { ReviewCountSummary } from './ReviewCountSummary';
import { FeedbackModal } from './FeedbackModal';
import { ReviewInlineExpansion } from './ReviewInlineExpansion';
import { ReviewSearchInput } from './ReviewSearchInput';
import { ReviewTable } from './ReviewTable';
import { useReviewPage } from './use-review-page';

// The table never changes width or position: a clicked row opens underneath itself, with the
// fields in a responsive grid (see ReviewInlineExpansion).
export function Review() {
  const c = useReviewPage();
  const { t, i18n } = c;

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide">
          <h1 className="text-3xl text-cs-primary mt-4 mb-6">{t('review_title')}</h1>

          <div className="flex flex-wrap items-center gap-3 mb-5">
            <ReviewSearchInput value={c.searchQuery} onChange={c.setSearchQuery} />
            <Select
              value={c.statusFilter}
              onChange={e => c.setStatusFilter(e.target.value as '' | '0' | '1' | '2')}
              className="border border-gray-300 rounded-lg p-2"
            >
              <option value="">{t('review_filter_status_all')}</option>
              <option value="0">{t('review_status_not_started')}</option>
              <option value="1">{t('review_status_todo')}</option>
              <option value="2">{t('review_status_in_review')}</option>
            </Select>
            {c.queryStatus === 'success' && (
              <ReviewCountSummary visibleCount={c.visibleRows.length} totalCount={c.rows.length} className="ml-auto" />
            )}
          </div>

          {/* Bar at the bottom of the screen for the selection, progress and results. It is
              position: fixed, not sticky: it comes before the table in the page, and a sticky
              bar would only stay in view when scrolling up, not while scrolling down the list. */}
          {(c.selectedIds.size > 0 || c.bulkRunning || c.bulkResults || c.lastBatchTasks) && (
            <div className="fixed inset-x-0 bottom-0 z-30 pointer-events-none">
            <div className="cs-container cs-container--wide pointer-events-none flex justify-center">
            <div className="pointer-events-auto mb-4 max-w-full">
              {c.selectedIds.size > 0 ? (
                <div className="flex items-center gap-1 p-1.5 bg-[#f3f8f8] rounded-full border-2 border-cs-accent/35">
                  <span className="px-3 text-sm text-gray-600 whitespace-nowrap">{t('review_bulk_selected_count', { count: c.selectedIds.size })}</span>
                  <span className="w-px self-stretch bg-gray-200" />
                  <button
                    onClick={c.openFeedbackForSelection}
                    disabled={!c.canSendBulkFeedback}
                    title={c.canSendBulkFeedback ? undefined : t('feedback_multi_submitter_hint')}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-none bg-transparent text-cs-tertiary cursor-pointer hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <LuMail aria-hidden="true" />
                    {t('feedback_button')}
                  </button>
                  <button
                    onClick={() => c.setConfirmingAccept(true)}
                    disabled={c.bulkRunning}
                    className="px-5 py-2 rounded-full text-sm font-semibold border-none bg-cs-primary text-white cursor-pointer hover:bg-cs-dark disabled:opacity-50"
                  >
                    {t('review_bulk_accept_button')}
                  </button>
                </div>
              ) : c.bulkRunning ? (
                <div className="flex items-center px-5 py-3 bg-[#f3f8f8] rounded-full border-2 border-cs-accent/35">
                  <p className="text-sm text-gray-500 m-0 whitespace-nowrap">
                    {t('review_bulk_progress', { current: c.bulkProgress.current, total: c.bulkProgress.total })}
                  </p>
                </div>
              ) : c.bulkResults ? (
                <div className="p-3 bg-[#f3f8f8] rounded-2xl border-2 border-cs-accent/35">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <p className="text-sm text-gray-700 m-0 whitespace-nowrap">
                      {t('review_bulk_results_summary', { success: c.successCount, failed: c.failedResults.length })}
                    </p>
                    {c.canSendLastBatchFeedback && (
                      <button
                        onClick={c.openFeedbackForLastBatch}
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-cs-tertiary bg-white text-cs-tertiary cursor-pointer hover:bg-gray-50"
                      >
                        <LuMail aria-hidden="true" />
                        {t('feedback_button')}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        c.setBulkResults(null);
                        c.dismissLastBatch();
                      }}
                      className="text-sm text-cs-primary bg-transparent border-none cursor-pointer hover:underline"
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
              ) : c.lastBatchTasks ? (
                <div className="flex items-center gap-1 p-1.5 bg-[#f3f8f8] rounded-full border-2 border-cs-accent/35">
                  <span className="flex items-center gap-2 px-3 text-sm text-gray-700 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-cs-secondary" />
                    {t('feedback_last_batch_summary', { count: c.lastBatchTasks.length })}
                  </span>
                  {c.canSendLastBatchFeedback && (
                    <button
                      onClick={c.openFeedbackForLastBatch}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-none bg-transparent text-cs-tertiary cursor-pointer hover:bg-gray-50"
                    >
                      <LuMail aria-hidden="true" />
                      {t('feedback_button')}
                    </button>
                  )}
                  <button
                    onClick={c.dismissLastBatch}
                    className="px-3 text-sm text-cs-primary bg-transparent border-none cursor-pointer hover:underline"
                  >
                    {t('common_close')}
                  </button>
                </div>
              ) : null}
            </div>
            </div>
            </div>
          )}

          {c.queryStatus === 'pending' && <p className="text-sm text-gray-500">{t('review_loading')}</p>}

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
                filterBySubmitter={c.filterBySubmitter}
                onPreview={c.setPreviewRow}
                openRowId={c.openRowId}
                onRowClick={row => c.setOpenRowId(id => (id === row.id ? null : row.id))}
                renderRowExpansion={row => (
                  <ReviewInlineExpansion
                    row={row}
                    editedDocument={c.editedDocuments[row.id]}
                    onDocumentChange={c.handleDocumentChange}
                    onRelease={() => c.handleRelease(row)}
                    releasing={c.releasing === row.id}
                    onClose={() => c.setOpenRowId(null)}
                    selected={c.selectedIds.has(row.id)}
                    onToggleSelect={() => c.toggleSelectRow(row.id)}
                  />
                )}
              />
            </div>
          )}

          {/* Room at the bottom so the last rows do not disappear behind the fixed bar above
              (a rough estimate of its height, not measured). */}
          {(c.selectedIds.size > 0 || c.bulkRunning || c.bulkResults || c.lastBatchTasks) && (
            <div className="h-20" aria-hidden="true" />
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

      {c.previewRow?.subjectRaw && (
        <ImagePreviewPopup
          subject={c.previewRow.subjectRaw}
          label={localeText(c.previewRow.subject.label, i18n.language) || c.previewRow.id}
          onClose={() => c.setPreviewRow(null)}
        />
      )}

      {c.feedbackTarget && (
        <FeedbackModal
          target={c.feedbackTarget}
          onSend={c.sendFeedback}
          onClose={c.closeFeedbackTarget}
          sending={c.sendingFeedback}
        />
      )}
    </CsPage>
  );
}
