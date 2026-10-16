import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReviewTaskDto, MadocAnnotationDocumentDto } from '@dissco-cs/shared-types';
import { SubmissionFieldsForm } from '../../components/capture-models/SubmissionFieldsForm';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useReviewRevisionDocument } from './use-review-revision-document';
import { localeText } from '../../utility/locale-text';
import { LuTrash2 } from 'react-icons/lu';

interface ReviewInlineExpansionProps {
  row: ReviewTaskDto;
  editedDocument: MadocAnnotationDocumentDto | undefined;
  onDocumentChange: (rowId: string, document: MadocAnnotationDocumentDto) => void;
  onRelease: () => void;
  releasing: boolean;
  onClose: () => void;
  /** The row's own selection checkbox, also shown in the opened row (the row itself may be scrolled away). */
  selected: boolean;
  onToggleSelect: () => void;
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
          <button onClick={onClose} className="bg-transparent border-none text-gray-500 hover:text-cs-primary cursor-pointer text-[0.8rem] font-semibold">
            {t('review_detail_close')}
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

// The opened row: an extra table row right under the clicked one (ReviewTable renderRowExpansion),
// with the fields in a grid that adapts to the number of sections (see SubmissionFieldsForm).
export function ReviewInlineExpansion({
  row,
  editedDocument,
  onDocumentChange,
  onRelease,
  releasing,
  onClose,
  selected,
  onToggleSelect,
}: ReviewInlineExpansionProps) {
  const { t, i18n } = useTranslation('dissco-cs');
  const [confirmingRelease, setConfirmingRelease] = useState(false);
  const title = localeText(row.subject.label, i18n.language) || row.id;
  const subtitle = row.submitter
    ? `${t('review_detail_submitted_by', { name: row.submitter })}${row.modifiedAt ? ` — ${new Date(row.modifiedAt).toLocaleString(i18n.language)}` : ''}`
    : '';

  const { revisionQuery, modelQuery, currentDocument, handleChange } = useReviewRevisionDocument(row, editedDocument, onDocumentChange);

  // Scroll the row into view only once the whole form is shown: before that the row only holds a
  // short "loading" text, and scrolling to that gives the wrong position once the form grows.
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

  if (revisionQuery.status === 'pending' || modelQuery.status === 'pending') {
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
            title={t('review_select_to_accept')}
            aria-label={title}
            className="cursor-pointer"
          />
          <button
            onClick={() => setConfirmingRelease(true)}
            disabled={releasing}
            aria-label={t('review_detail_release_button')}
            title={t('review_detail_release_button')}
            className="bg-transparent border-none text-gray-600 hover:text-cs-primary transition-colors duration-200 cursor-pointer p-1 disabled:opacity-50"
          >
            <LuTrash2 />
          </button>
        </>
      }
    >
      <SubmissionFieldsForm model={modelQuery.data} document={currentDocument} onChange={handleChange} />
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
