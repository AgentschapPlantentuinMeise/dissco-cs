import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReviewTaskRow } from '../../api/cs-api';
import { ReviewFieldForm } from '../../components/ReviewFieldForm';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useReviewRevisionDocument } from './useReviewRevisionDocument';
import { AnnotationDocument } from '../../capture-model/types/document';
import { localeText } from '../../utility/locale-text';

interface ReviewInlineExpansionProps {
  row: ReviewTaskRow;
  editedDocument: AnnotationDocument | undefined;
  onDocumentChange: (rowId: string, document: AnnotationDocument) => void;
  onAccept: () => void;
  accepting: boolean;
  onRelease: () => void;
  releasing: boolean;
  releaseError: string | null;
  onClose: () => void;
  error: string | null;
}

function ExpansionChrome({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  const { t } = useTranslation('dissco-cs');
  return (
    <div className="bg-gray-50 border-t border-gray-200 px-6 lg:px-8 py-5">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <div className="text-[0.92rem] font-bold text-gray-800">{title}</div>
          <div className="text-[0.74rem] text-gray-500 mt-0.5">{subtitle}</div>
        </div>
        <button onClick={onClose} className="bg-transparent border-none text-gray-500 hover:text-[var(--cs-primary)] cursor-pointer text-[0.8rem] font-semibold">
          {t('review_detail_close')}
        </button>
      </div>
      {children}
    </div>
  );
}

// Inline-uitklap-variant: verschijnt als een extra rij direct onder de aangeklikte tabelrij (zie
// ReviewTable's renderRowExpansion) i.p.v. een zijpaneel. Velden staan in een grid die zelf
// herschikt naar het aantal secties -- zie ReviewFieldForm.
export function ReviewInlineExpansion({ row, editedDocument, onDocumentChange, onAccept, accepting, onRelease, releasing, releaseError, onClose, error }: ReviewInlineExpansionProps) {
  const { t, i18n } = useTranslation('dissco-cs');
  const [confirmingRelease, setConfirmingRelease] = useState(false);
  const title = localeText(row.subject.label, i18n.language) || row.id;
  const subtitle = row.submitter
    ? `${t('review_detail_submitted_by', { name: row.submitter })}${row.modified_at ? ` — ${new Date(row.modified_at).toLocaleString(i18n.language)}` : ''}`
    : '';

  const { revisionQuery, modelQuery, currentDocument, handleChange } = useReviewRevisionDocument(row, editedDocument, onDocumentChange);

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
    <ExpansionChrome title={title} subtitle={subtitle} onClose={onClose}>
      <ReviewFieldForm model={modelQuery.data} document={currentDocument} onChange={handleChange} />
      <div className="mt-5 pt-4 border-t border-gray-200 flex items-center gap-3">
        {(error || releaseError) && <span className="text-[0.78rem] text-red-600">{error ?? releaseError}</span>}
        <button
          onClick={() => setConfirmingRelease(true)}
          disabled={releasing}
          className="ml-auto px-5 py-[9px] rounded-full text-sm font-bold border border-gray-300 bg-white text-gray-700 cursor-pointer hover:bg-gray-50 disabled:opacity-50"
        >
          {t('review_detail_release_button')}
        </button>
        <button
          onClick={onAccept}
          disabled={accepting}
          className="px-5 py-[9px] rounded-full text-sm font-bold border-none bg-[var(--cs-primary)] text-white cursor-pointer hover:bg-[var(--cs-dark)] disabled:opacity-50"
        >
          {t('review_detail_accept_button')}
        </button>
      </div>
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
