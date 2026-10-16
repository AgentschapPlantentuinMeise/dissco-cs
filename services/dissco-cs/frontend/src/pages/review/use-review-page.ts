import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewKeys, reviewQueries } from '../../api/queries/review';
import { feedbackKeys } from '../../api/queries/feedback';
import { reviewApi } from '../../api/cs-client/review';
import { feedbackApi } from '../../api/cs-client/feedback';
import { ReviewTaskDto, MadocAnnotationDocumentDto } from '@dissco-cs/shared-types';
import { reportClientError } from '../../api/cs-client/client-errors';
import { captureModelsApi } from '../../api/cs-client/capture-models';
import { localeText } from '../../utility/locale-text';
import { useCurrentUser } from '../../hooks/use-current-user';

export type SortKey = 'project' | 'subject' | 'status' | 'submitter' | 'reviewer' | 'modifiedAt';
export type SortDir = 'asc' | 'desc';
export type BulkResult = { id: string; label: string; success: boolean; error?: string };

// Only the submitter: used to check, before a recipient is chosen, that a selection or batch
// comes from one single submitter.
type BatchSubmitterRef = { submitterId?: number; submitterName?: string };
export type FeedbackComposeTarget = { submitterId: number; submitterName: string };

function submitterRefFromRow(row: ReviewTaskDto): BatchSubmitterRef {
  return {
    submitterId: row.submitterId,
    submitterName: row.submitter,
  };
}

// The common submitter when every task in the list has the same submitterId, otherwise null --
// guards both the bulk selection and the "last batch" after an accept.
function singleSubmitter(refs: BatchSubmitterRef[]): { id: number; name: string } | null {
  if (refs.length === 0) return null;
  const ids = new Set(refs.map(ref => ref.submitterId).filter((id): id is number => id !== undefined));
  if (ids.size !== 1) return null;
  const id = Array.from(ids)[0];
  const match = refs.find(ref => ref.submitterId === id && ref.submitterName);
  return match?.submitterName ? { id, name: match.submitterName } : null;
}

// All data, filtering, sorting, selection and accept logic of the review page.
export function useReviewPage() {
  const { t, i18n } = useTranslation('dissco-cs');
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const { data, status: queryStatus } = useQuery({ ...reviewQueries.tasks(), staleTime: 0 });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | '0' | '1' | '2'>('');
  const [sortKey, setSortKey] = useState<SortKey>('modifiedAt');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingAccept, setConfirmingAccept] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);
  const [previewRow, setPreviewRow] = useState<ReviewTaskDto | null>(null);

  // Which row is open, and the corrections per row not yet accepted -- on purpose NOT saved
  // automatically: they stay local until the task is accepted (alone or in bulk).
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [editedDocuments, setEditedDocuments] = useState<Record<string, MadocAnnotationDocumentDto>>({});

  // Who the feedback modal is for (before an accept, from a row icon, the bar or the selection),
  // and the "last processed batch", kept after an accept until the next one (shown in the bar
  // of Review.tsx).
  const [feedbackTarget, setFeedbackTarget] = useState<FeedbackComposeTarget | null>(null);
  const [lastBatchTasks, setLastBatchTasks] = useState<BatchSubmitterRef[] | null>(null);

  // Tasks just released but still in the server list: Madoc sets the linked review task to -1
  // later, through its own background events, so a reload right after the release still shows
  // the row. Hidden locally instead of waiting.
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // A reviewer only ever sees the tasks assigned to them: the backend returns every open review
  // task of the site, this page keeps only your own queue. So every row can be selected and
  // accepted (Madoc would also refuse someone else's task, its "limited reviewer" check).
  const rows = (data ?? []).filter(row => !!user && row.reviewerId === user.id && !dismissedIds.has(row.id));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(dir => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const visibleRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = rows.filter(row => {
      if (statusFilter !== '' && String(row.status) !== statusFilter) return false;
      if (!query) return true;
      const projectLabel = localeText(row.project.label, i18n.language) || row.project.slug || '';
      const subjectLabel = localeText(row.subject.label, i18n.language) || row.id;
      return (
        projectLabel.toLowerCase().includes(query) ||
        subjectLabel.toLowerCase().includes(query) ||
        (row.reviewer ?? '').toLowerCase().includes(query) ||
        (row.submitter ?? '').toLowerCase().includes(query)
      );
    });

    const sorted = filtered.slice().sort((a, b) => {
      let result = 0;
      switch (sortKey) {
        case 'project':
          result = (localeText(a.project.label, i18n.language) || a.project.slug || '').localeCompare(
            localeText(b.project.label, i18n.language) || b.project.slug || ''
          );
          break;
        case 'subject':
          result = (localeText(a.subject.label, i18n.language) || a.id).localeCompare(
            localeText(b.subject.label, i18n.language) || b.id
          );
          break;
        case 'status':
          result = a.status - b.status;
          break;
        case 'submitter':
          result = (a.submitter ?? '').localeCompare(b.submitter ?? '');
          break;
        case 'reviewer':
          result = (a.reviewer ?? '').localeCompare(b.reviewer ?? '');
          break;
        case 'modifiedAt':
          result = (a.modifiedAt ?? 0) - (b.modifiedAt ?? 0);
          break;
      }
      return sortDir === 'asc' ? result : -result;
    });

    return sorted;
  }, [rows, searchQuery, statusFilter, sortKey, sortDir, i18n.language]);

  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every(row => selectedIds.has(row.id));

  // A selection can span several submitters; feedback can only be sent when the whole selection
  // is from one submitter. Bulk accept does not depend on this.
  const selectedRowsForFeedback = rows.filter(row => selectedIds.has(row.id));
  const bulkFeedbackSubmitter = singleSubmitter(selectedRowsForFeedback.map(submitterRefFromRow));
  const canSendBulkFeedback = selectedIds.size > 0 && bulkFeedbackSubmitter !== null;

  const lastBatchSubmitter = lastBatchTasks ? singleSubmitter(lastBatchTasks) : null;
  const canSendLastBatchFeedback = !!lastBatchTasks && lastBatchSubmitter !== null;

  const toggleSelectAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleRows.forEach(row => next.delete(row.id));
      } else {
        visibleRows.forEach(row => next.add(row.id));
      }
      return next;
    });
  };

  // Ticking the open row means "fine, this may be accepted": it closes that row and opens the
  // next visible one, so the reviewer can work through the list row by row. Unticking, or
  // ticking a row that is not open (e.g. "select all"), leaves the open row alone.
  const toggleSelectRow = (id: string) => {
    const isChecking = !selectedIds.has(id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    if (isChecking && openRowId === id) {
      const idx = visibleRows.findIndex(row => row.id === id);
      const nextRow = idx >= 0 && idx + 1 < visibleRows.length ? visibleRows[idx + 1] : null;
      setOpenRowId(nextRow ? nextRow.id : null);
    }
  };

  const filterBySubmitter = (name: string) => setSearchQuery(name);

  // Shared by bulk accept and the single "accept task" action: fetches the revision fresh, and
  // replaces its document with the reviewer's local correction when there is one. structureId
  // and fields come along unchanged in revisionRequest.revision.
  const acceptOneRow = async (row: ReviewTaskDto, editedDocument: MadocAnnotationDocumentDto | undefined) => {
    if (!row.revisionId || !row.originalTaskId) {
      throw new Error(t('review_bulk_error_no_revision'));
    }
    const revisionRequest = await captureModelsApi.getRevision(row.revisionId);
    await captureModelsApi.updateRevision(
      {
        ...revisionRequest,
        document: editedDocument ?? revisionRequest.document,
        status: 'accepted',
        revision: { ...revisionRequest.revision, accepted: true },
      },
      'accepted'
    );
    await reviewApi.updateTask(row.originalTaskId, {
      status: 3,
      status_text: 'Approved',
      state: { changesRequested: '' },
    });
  };

  const runBulkAccept = async () => {
    setConfirmingAccept(false);
    setBulkResults(null);
    const ids = Array.from(selectedIds);
    setBulkRunning(true);
    setBulkProgress({ current: 0, total: ids.length });

    const results: BulkResult[] = [];
    const acceptedTasks: BatchSubmitterRef[] = [];
    for (const id of ids) {
      const row = rows.find(r => r.id === id);
      const label = row ? localeText(row.subject.label, i18n.language) || row.id : id;
      setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));

      if (!row || !row.revisionId || !row.originalTaskId) {
        results.push({ id, label, success: false, error: t('review_bulk_error_no_revision') });
        continue;
      }

      try {
        await acceptOneRow(row, editedDocuments[id]);
        results.push({ id, label, success: true });
        acceptedTasks.push(submitterRefFromRow(row));
      } catch (err) {
        // Per-row result instead of a toast; the user only ever sees our own translated text.
        reportClientError(err, 'action');
        results.push({ id, label, success: false, error: t('review_bulk_error_generic') });
      }
    }

    if (acceptedTasks.length > 0) {
      setLastBatchTasks(acceptedTasks);
    }

    setBulkRunning(false);
    setBulkResults(results);
    setSelectedIds(new Set());
    setEditedDocuments(prev => {
      const next = { ...prev };
      ids.forEach(id => delete next[id]);
      return next;
    });
    setOpenRowId(current => (current && ids.includes(current) ? null : current));
    await queryClient.invalidateQueries({ queryKey: reviewKeys.tasks() });
  };

  const successCount = bulkResults?.filter(r => r.success).length ?? 0;
  const failedResults = bulkResults?.filter(r => !r.success) ?? [];

  const handleDocumentChange = (rowId: string, document: MadocAnnotationDocumentDto) => {
    setEditedDocuments(prev => ({ ...prev, [rowId]: document }));
  };

  // Sets the original task to -1 ("rejected"). No data is deleted, but the manifest no longer
  // counts as contributed (madoc-ts's resourceTaskCountsAsContribution skips -1), so any
  // volunteer can claim it again, with an empty form.
  const releaseMutation = useMutation({
    mutationFn: ({ taskId }: { rowId: string; taskId: string }) =>
      reviewApi.updateTask(taskId, { status: -1, status_text: 'Rejected' }),
    onSuccess: (_result, { rowId }) => {
      setDismissedIds(prev => new Set(prev).add(rowId));
      setOpenRowId(current => {
        const idx = visibleRows.findIndex(r => r.id === current);
        return idx >= 0 && idx + 1 < visibleRows.length ? visibleRows[idx + 1].id : null;
      });
      queryClient.invalidateQueries({ queryKey: reviewKeys.tasks() });
    },
    meta: { errorMessage: 'error_release_failed' },
  });
  const releasing = releaseMutation.isPending ? releaseMutation.variables.rowId : null;

  const handleRelease = (row: ReviewTaskDto) => {
    if (!row.originalTaskId) return;
    releaseMutation.mutate({ rowId: row.id, taskId: row.originalTaskId });
  };

  const openFeedbackForSelection = () => {
    if (!bulkFeedbackSubmitter) return;
    setFeedbackTarget({
      submitterId: bulkFeedbackSubmitter.id,
      submitterName: bulkFeedbackSubmitter.name,
    });
  };

  const openFeedbackForLastBatch = () => {
    if (!lastBatchTasks || !lastBatchSubmitter) return;
    setFeedbackTarget({
      submitterId: lastBatchSubmitter.id,
      submitterName: lastBatchSubmitter.name,
    });
  };

  const closeFeedbackTarget = () => setFeedbackTarget(null);

  const dismissLastBatch = () => setLastBatchTasks(null);

  const { mutate: createFeedbackThread, isPending: sendingFeedback } = useMutation({
    mutationFn: feedbackApi.createThread,
    onSuccess: () => {
      setFeedbackTarget(null);
      // The new thread shows up in the reviewer's own dashboard list and navbar badge.
      queryClient.invalidateQueries({ queryKey: feedbackKeys.threads() });
    },
    meta: { errorMessage: 'error_send_failed' },
  });

  const sendFeedback = (subject: string, body: string) => {
    if (!feedbackTarget) return;
    createFeedbackThread({
      recipientUserId: feedbackTarget.submitterId,
      recipientName: feedbackTarget.submitterName,
      subject,
      body,
    });
  };

  // Arrow up/down moves through the rows -- only when the focus is not in a form field, so moving
  // the text cursor while correcting keeps working.
  useEffect(() => {
    if (queryStatus !== 'success' || visibleRows.length === 0) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active?.isContentEditable) return;

      event.preventDefault();
      setOpenRowId(current => {
        const idx = current ? visibleRows.findIndex(r => r.id === current) : -1;
        const nextIdx =
          idx === -1
            ? event.key === 'ArrowDown' ? 0 : visibleRows.length - 1
            : event.key === 'ArrowDown'
            ? Math.min(idx + 1, visibleRows.length - 1)
            : Math.max(idx - 1, 0);
        return visibleRows[nextIdx].id;
      });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [queryStatus, visibleRows]);

  return {
    t,
    i18n,
    queryStatus,
    rows,
    visibleRows,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortKey,
    sortDir,
    toggleSort,
    selectedIds,
    allVisibleSelected,
    toggleSelectAllVisible,
    toggleSelectRow,
    filterBySubmitter,
    previewRow,
    setPreviewRow,
    openRowId,
    setOpenRowId,
    editedDocuments,
    handleDocumentChange,
    releasing,
    handleRelease,
    confirmingAccept,
    setConfirmingAccept,
    bulkRunning,
    bulkProgress,
    bulkResults,
    setBulkResults,
    successCount,
    failedResults,
    runBulkAccept,
    canSendBulkFeedback,
    lastBatchTasks,
    canSendLastBatchFeedback,
    lastBatchSubmitter,
    dismissLastBatch,
    feedbackTarget,
    sendingFeedback,
    openFeedbackForSelection,
    openFeedbackForLastBatch,
    closeFeedbackTarget,
    sendFeedback,
  };
}
