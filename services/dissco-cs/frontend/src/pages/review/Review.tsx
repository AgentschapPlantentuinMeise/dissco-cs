import { PageHeader } from '../../components/layout/PageHeader';
import { PageSection } from '../../components/layout/PageSection';
import { PageLoadError } from '../../components/layout/PageLoadError';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { LuMail } from 'react-icons/lu';
import { localeText } from '../../utility/locale-text';
import { ImagePreviewPopup } from '../../components/iiif/ImagePreviewPopup';
import { ReviewCountSummary } from './ReviewCountSummary';
import { FeedbackModal } from './FeedbackModal';
import { ReviewInlineExpansion } from './ReviewInlineExpansion';
import { ReviewSearchInput } from './ReviewSearchInput';
import { ReviewTable } from './ReviewTable';
import { Pagination } from '../../components/ui/Pagination';
import { useReviewPage } from './use-review-page';
import { LoadingText } from '../../components/layout/LoadingText';
import { EmptyText } from '../../components/layout/EmptyText';
import { SavedNotice } from '../../components/ui/SavedNotice';
import { useTranslation } from 'react-i18next';

// The feedback button in the bar, or the confirmation once feedback was sent for what the bar shows.
function FeedbackBarAction({ sent, onClick, disabled, title }: {
  sent: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  const { t } = useTranslation('dissco-cs');
  if (sent) {
    return <SavedNotice>{t('feedback_sent')}</SavedNotice>;
  }
  return (
    <Button variant="secondary" size="sm" onClick={onClick} disabled={disabled} title={title}>
      <LuMail aria-hidden="true" />
      {t('feedback_button')}
    </Button>
  );
}

// The table never changes width or position: a clicked row opens underneath itself, with the
// fields in a responsive grid (see ReviewInlineExpansion).
export function Review() {
  const c = useReviewPage();
  const { t, i18n } = c;

  if (c.load === 'failed') {
    return <PageLoadError />;
  }

  return (
    <>
      <PageHeader
        variant="compact"
        title={t('review_title')}
        lead={t('review_intro')}
        stats={[{ value: c.load === 'ready' ? c.rows.length : '—', label: t('review_stat_to_review') }]}
      />
      <PageSection>
        <div className="flex flex-wrap items-center gap-3">
          <ReviewSearchInput value={c.searchQuery} onChange={c.setSearchQuery} />
          {c.load === 'ready' && (
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
              <div className="flex items-center gap-2 p-1.5 bg-[#f3f8f8] rounded border-2 border-cs-accent/35">
                <span className="px-3 text-sm text-gray-600 whitespace-nowrap">{t('review_bulk_selected_count', { count: c.selectedIds.size })}</span>
                <span className="w-px self-stretch bg-gray-200" />
                <FeedbackBarAction
                  sent={c.feedbackSent}
                  onClick={c.openFeedbackForSelection}
                  disabled={!c.canSendBulkFeedback}
                  title={c.canSendBulkFeedback ? undefined : t('feedback_multi_submitter_hint')}
                />
                <Button size="sm" onClick={() => c.setConfirmingAccept(true)} disabled={c.bulkRunning}>
                  {t('review_bulk_accept_button')}
                </Button>
              </div>
            ) : c.bulkRunning ? (
              <div className="flex items-center px-5 py-3 bg-[#f3f8f8] rounded border-2 border-cs-accent/35">
                <p className="text-sm text-gray-500 m-0 whitespace-nowrap">
                  {t('review_bulk_progress', { current: c.bulkProgress.current, total: c.bulkProgress.total })}
                </p>
              </div>
            ) : c.bulkResults ? (
              <div className="p-3 bg-[#f3f8f8] rounded border-2 border-cs-accent/35">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <p className="text-sm text-gray-700 m-0 whitespace-nowrap">
                    {t('review_bulk_results_summary', { success: c.successCount, failed: c.failedResults.length })}
                  </p>
                  {c.canSendLastBatchFeedback && (
                    <FeedbackBarAction sent={c.feedbackSent} onClick={c.openFeedbackForLastBatch} />
                  )}
                  <Button
                    variant="text"
                    size="sm"
                    onClick={() => {
                      c.setBulkResults(null);
                      c.dismissLastBatch();
                    }}
                  >
                    {t('common_close')}
                  </Button>
                </div>
                {c.failedResults.length > 0 && (
                  <ul className="mt-2 mb-0 pl-4 text-sm text-danger-700 space-y-1">
                    {c.failedResults.map(r => (
                      <li key={r.id}>
                        {r.label}: {r.error}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : c.lastBatchTasks ? (
              <div className="flex items-center gap-2 p-1.5 bg-[#f3f8f8] rounded border-2 border-cs-accent/35">
                <span className="flex items-center gap-2 px-3 text-sm text-gray-700 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-cs-secondary" />
                  {t('feedback_last_batch_summary', { count: c.lastBatchTasks.length })}
                </span>
                {c.canSendLastBatchFeedback && (
                  <FeedbackBarAction sent={c.feedbackSent} onClick={c.openFeedbackForLastBatch} />
                )}
                <Button variant="text" size="sm" className="px-3" onClick={c.dismissLastBatch}>
                  {t('common_close')}
                </Button>
              </div>
            ) : null}
          </div>
          </div>
          </div>
        )}

        {c.load === 'loading' && <LoadingText />}

        {c.load === 'ready' && c.rows.length === 0 && (
          <EmptyText>{t('review_empty')}</EmptyText>
        )}

        {c.load === 'ready' && c.incomplete && (
          <div role="alert" className="flex items-center gap-3 flex-wrap mb-4 px-5 py-3 bg-attention-50 border border-attention-200 rounded-lg text-attention-800 text-[0.95rem]">
            <span>{t('review_list_incomplete')}</span>
            <Button variant="secondary" size="sm" onClick={c.retry}>
              {t('error_page_load_retry')}
            </Button>
          </div>
        )}

        {c.load === 'ready' && c.rows.length > 0 && (
          <div className="bg-white border-t border-gray-200">
            <ReviewTable
              visibleRows={c.pageRows}
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
            <Pagination currentPage={c.page} totalPages={c.totalPages} onChange={c.goToPage} label={t('review_pagination_label')} />
          </div>
        )}

        {/* Room at the bottom so the last rows do not disappear behind the fixed bar above
            (a rough estimate of its height, not measured). */}
        {(c.selectedIds.size > 0 || c.bulkRunning || c.bulkResults || c.lastBatchTasks) && (
          <div className="h-20" aria-hidden="true" />
        )}
      </PageSection>

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
    </>
  );
}
