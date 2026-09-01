import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReviewTaskRow } from '../../api/cs-api';
import { ReviewFieldForm } from '../../components/ReviewFieldForm';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useReviewRevisionDocument } from './useReviewRevisionDocument';
import { AnnotationDocument } from '../../capture-model/types/document';
import { localeText } from '../../utility/locale-text';
import { LuTrash2 } from 'react-icons/lu';

interface ReviewInlineExpansionProps {
  row: ReviewTaskRow;
  editedDocument: AnnotationDocument | undefined;
  onDocumentChange: (rowId: string, document: AnnotationDocument) => void;
  onRelease: () => void;
  releasing: boolean;
  releaseError: string | null;
  onClose: () => void;
  /** Mirrors the row's own bulk-selection checkbox — same state, same handler, just reachable
      from the detail view too instead of only from the (possibly scrolled-away) row. */
  selected: boolean;
  onToggleSelect: () => void;
  selectable: boolean;
}

function ExpansionChrome({
  title,
  subtitle,
  onClose,
  headerAction,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useTranslation('dissco-cs');
  return (
    <div className="bg-gray-50 border-t border-gray-200 px-6 lg:px-8 py-5">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <div className="text-[0.92rem] font-bold text-gray-800">{title}</div>
          <div className="text-[0.74rem] text-gray-500 mt-0.5">{subtitle}</div>
        </div>
        <div className="flex items-center gap-3">
          {headerAction}
          <button onClick={onClose} className="bg-transparent border-none text-gray-500 hover:text-[var(--cs-primary)] cursor-pointer text-[0.8rem] font-semibold">
            {t('review_detail_close')}
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

// Inline-uitklap-variant: verschijnt als een extra rij direct onder de aangeklikte tabelrij (zie
// ReviewTable's renderRowExpansion) i.p.v. een zijpaneel. Velden staan in een grid die zelf
// herschikt naar het aantal secties -- zie ReviewFieldForm.
export function ReviewInlineExpansion({
  row,
  editedDocument,
  onDocumentChange,
  onRelease,
  releasing,
  releaseError,
  onClose,
  selected,
  onToggleSelect,
  selectable,
}: ReviewInlineExpansionProps) {
  const { t, i18n } = useTranslation('dissco-cs');
  const [confirmingRelease, setConfirmingRelease] = useState(false);
  const title = localeText(row.subject.label, i18n.language) || row.id;
  const subtitle = row.submitter
    ? `${t('review_detail_submitted_by', { name: row.submitter })}${row.modified_at ? ` — ${new Date(row.modified_at).toLocaleString(i18n.language)}` : ''}`
    : '';

  const { revisionQuery, modelQuery, currentDocument, handleChange } = useReviewRevisionDocument(row, editedDocument, onDocumentChange);

  // Pas centreren zodra het volledige formulier gemonteerd is -- vóór dat moment toont de rij nog
  // enkel een korte "laden..."-placeholder, en scrollIntoView daarop geeft de verkeerde positie
  // zodra het formulier daarna groeit.
  useEffect(() => {
    if (revisionQuery.status !== 'success' || modelQuery.status !== 'success') return;
    document.querySelector(`tr[data-expansion-row-id="${row.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [row.id, revisionQuery.status, modelQuery.status]);

  if (!row.revisionId || !row.originalTaskId) {
    return (
      <ExpansionChrome title={title} subtitle={subtitle} onClose={onClose}>
        <p className="text-sm text-gray-500">{t('review_bulk_error_no_revision')}</p>
      </ExpansionChrome>
    );
  }

  if (revisionQuery.status === 'loading' || modelQuery.status === 'loading') {
    return (
      <ExpansionChrome title={title} subtitle={subtitle} onClose={onClose}>
        <p className="text-sm text-gray-500">{t('review_detail_loading')}</p>
      </ExpansionChrome>
    );
  }

  if (revisionQuery.status === 'error' || modelQuery.status === 'error' || !modelQuery.data || !revisionQuery.data || !currentDocument) {
    return (
      <ExpansionChrome title={title} subtitle={subtitle} onClose={onClose}>
        <p className="text-sm text-red-600">{t('review_detail_error')}</p>
      </ExpansionChrome>
    );
  }

  return (
    <ExpansionChrome
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      headerAction={
        <>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            disabled={!selectable}
            title={selectable ? t('review_select_to_accept') : t('review_not_own_task')}
            aria-label={title}
            className="cursor-pointer disabled:cursor-not-allowed"
          />
          <button
            onClick={() => setConfirmingRelease(true)}
            disabled={releasing}
            aria-label={t('review_detail_release_button')}
            title={t('review_detail_release_button')}
            className="bg-transparent border-none text-gray-600 hover:text-[var(--cs-primary)] transition-colors duration-200 cursor-pointer p-1 disabled:opacity-50"
          >
            <LuTrash2 />
          </button>
        </>
      }
    >
      <ReviewFieldForm model={modelQuery.data} document={currentDocument} onChange={handleChange} />
      {releaseError && <p className="mt-3 text-[0.78rem] text-red-600">{releaseError}</p>}
      {confirmingRelease && (
        <ConfirmDialog
          title={t('review_detail_release_confirm_title')}
          message={t('review_detail_release_confirm')}
          confirmLabel={t('review_detail_release_button')}
          cancelLabel={t('common_cancel')}
          onConfirm={() => {
            setConfirmingRelease(false);
            onRelease();
          }}
          onCancel={() => setConfirmingRelease(false)}
        />
      )}
    </ExpansionChrome>
  );
}
