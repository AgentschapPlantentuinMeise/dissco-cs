import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { reviewApi, ReviewTaskRow } from '../../api/cs-api';
import { madocClient, ApiError } from '../../api/madoc-client';
import { localeText } from '../../utility/locale-text';
import { useUser } from '../../hooks/use-current-user';
import { AnnotationDocument } from '../../capture-model/types/document';

export type SortKey = 'project' | 'subject' | 'status' | 'submitter' | 'reviewer' | 'modified_at';
export type SortDir = 'asc' | 'desc';
export type BulkResult = { id: string; label: string; success: boolean; error?: string };

// Alle data, filter/sort-, selectie- en accept-logica voor de review-pagina zit hier.
export function useReviewTasksController() {
  const { t, i18n } = useTranslation('dissco-cs');
  const user = useUser();
  const { data, status: queryStatus, refetch } = useQuery('review-my-tasks', () => reviewApi.myTasks(), { staleTime: 0 });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | '0' | '1' | '2'>('');
  const [sortKey, setSortKey] = useState<SortKey>('modified_at');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingAccept, setConfirmingAccept] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);
  const [previewRow, setPreviewRow] = useState<ReviewTaskRow | null>(null);

  // Welke rij het detail toont, en de nog-niet-geaccepteerde correcties per
  // rij -- bewust NIET auto-saved, blijft lokale state tot de taak (los of in bulk) geaccepteerd
  // wordt.
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [editedDocuments, setEditedDocuments] = useState<Record<string, AnnotationDocument>>({});
  const [singleAccepting, setSingleAccepting] = useState<string | null>(null);
  const [singleAcceptError, setSingleAcceptError] = useState<string | null>(null);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  // Enkel taken waarvan de ingelogde gebruiker zelf de toegewezen reviewer is -- de backend
  // levert nog steeds alle site-brede review-taken aan (zie review.routes.ts), maar deze
  // pagina's tonen voortaan enkel de eigen wachtrij.
  const rows = (data?.tasks ?? []).filter(row => !!user && row.reviewerId === user.id);

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
        case 'modified_at':
          result = (a.modified_at ?? 0) - (b.modified_at ?? 0);
          break;
      }
      return sortDir === 'asc' ? result : -result;
    });

    return sorted;
  }, [rows, searchQuery, statusFilter, sortKey, sortDir, i18n.language]);

  // Enkel taken die effectief aan de ingelogde gebruiker toegewezen zijn mogen geselecteerd/
  // geaccepteerd worden -- Madoc's eigen "limited-reviewer"-check zou dit server-side ook
  // blokkeren, maar we willen het hier al duidelijk maken i.p.v. pas na een mislukte poging.
  const isOwnTask = (row: ReviewTaskRow) => !!user && row.reviewerId === user.id;

  const selectableVisibleRows = visibleRows.filter(isOwnTask);
  const allVisibleSelected = selectableVisibleRows.length > 0 && selectableVisibleRows.every(row => selectedIds.has(row.id));

  const toggleSelectAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        selectableVisibleRows.forEach(row => next.delete(row.id));
      } else {
        selectableVisibleRows.forEach(row => next.add(row.id));
      }
      return next;
    });
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filterBySubmitter = (name: string) => setSearchQuery(name);

  // Gedeeld door bulk-accept en de losse "Accepteer taak"-actie: haalt de revisie vers op (zoals
  // voorheen), maar overschrijft het document met de lokale correctie indien de reviewer die
  // gemaakt heeft -- structureId/fields komen ongewijzigd mee via revisionRequest.revision.
  const acceptOneRow = async (row: ReviewTaskRow, editedDocument: AnnotationDocument | undefined) => {
    if (!row.revisionId || !row.originalTaskId) {
      throw new Error(t('review_bulk_error_no_revision'));
    }
    const revisionRequest = await madocClient.getCaptureModelRevision(row.revisionId);
    await madocClient.updateCaptureModelRevision(
      {
        ...revisionRequest,
        document: editedDocument ?? revisionRequest.document,
        status: 'accepted',
        revision: { ...revisionRequest.revision, accepted: true },
      },
      'accepted'
    );
    await madocClient.updateRevisionTask(row.originalTaskId, {
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
    for (const id of ids) {
      const row = rows.find(r => r.id === id);
      const label = row ? localeText(row.subject.label, i18n.language) || row.id : id;
      setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));

      if (!row) {
        results.push({ id, label, success: false, error: t('review_bulk_error_no_revision') });
        continue;
      }

      try {
        await acceptOneRow(row, editedDocuments[id]);
        results.push({ id, label, success: true });
      } catch (err) {
        const message = err instanceof ApiError ? err.message : t('review_bulk_error_generic');
        results.push({ id, label, success: false, error: message });
      }
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
    await refetch();
  };

  const successCount = bulkResults?.filter(r => r.success).length ?? 0;
  const failedResults = bulkResults?.filter(r => !r.success) ?? [];

  const handleDocumentChange = (rowId: string, document: AnnotationDocument) => {
    setEditedDocuments(prev => ({ ...prev, [rowId]: document }));
  };

  const handleSingleAccept = async (row: ReviewTaskRow) => {
    setSingleAcceptError(null);
    setSingleAccepting(row.id);
    try {
      await acceptOneRow(row, editedDocuments[row.id]);
      setEditedDocuments(prev => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      await refetch();
      setOpenRowId(current => {
        const idx = visibleRows.findIndex(r => r.id === current);
        return idx >= 0 && idx + 1 < visibleRows.length ? visibleRows[idx + 1].id : null;
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('review_bulk_error_generic');
      setSingleAcceptError(message);
    } finally {
      setSingleAccepting(null);
    }
  };

  // Zet de originele taak op status -1 ("afgewezen"). Dit verwijdert geen data, maar zorgt ervoor
  // dat de resource nergens meer als "al gecontribueerd" meetelt (resourceTaskCountsAsContribution
  // in madoc-ts sluit status -1 expliciet uit) -- de opdracht komt dus vrij voor eender welke
  // gebruiker om opnieuw te claimen, met een leeg formulier (zie AnnotatePage.tsx).
  const handleRelease = async (row: ReviewTaskRow) => {
    if (!row.originalTaskId) return;
    setReleaseError(null);
    setReleasing(row.id);
    try {
      await madocClient.updateRevisionTask(row.originalTaskId, { status: -1, status_text: 'Rejected' });
      await refetch();
      setOpenRowId(current => (current === row.id ? null : current));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('review_bulk_error_generic');
      setReleaseError(message);
    } finally {
      setReleasing(null);
    }
  };

  // Pijltje omhoog/omlaag doorloopt visibleRows -- enkel als de focus niet in een formulierveld
  // staat, zodat normale tekst-cursornavigatie tijdens het corrigeren niet gekaapt wordt.
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
        const nextRow = visibleRows[nextIdx];
        document.querySelector(`tr[data-row-id="${nextRow.id}"]`)?.scrollIntoView({ block: 'nearest' });
        return nextRow.id;
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
    isOwnTask,
    filterBySubmitter,
    previewRow,
    setPreviewRow,
    openRowId,
    setOpenRowId,
    editedDocuments,
    handleDocumentChange,
    singleAccepting,
    singleAcceptError,
    handleSingleAccept,
    releasing,
    releaseError,
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
  };
}
