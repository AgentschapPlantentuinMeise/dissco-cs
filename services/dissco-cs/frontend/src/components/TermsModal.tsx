import React from 'react';
import { CsMarkdown } from './CsMarkdown';
import { SiteTerms } from '../api/madoc-client';

type TermsModalProps = {
  title: string;
  intro?: string;
  terms: SiteTerms;
  acceptLabel: string;
  cancelLabel: string;
  onAccept: () => void;
  onCancel: () => void;
  disabled?: boolean;
};

// Shared by Register.tsx (review terms before creating an account) and Login.tsx
// (re-accept terms that changed since the user's last acceptance).
export const TermsModal: React.FC<TermsModalProps> = ({
  title,
  intro,
  terms,
  acceptLabel,
  cancelLabel,
  onAccept,
  onCancel,
  disabled,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.2)] p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl text-[var(--cs-primary)] mb-4">{title}</h2>
        {intro && <p className="text-base text-gray-600 mb-4">{intro}</p>}
        {terms.terms?.markdown ? (
          <CsMarkdown content={terms.terms.markdown} />
        ) : (
          <p className="text-gray-800 whitespace-pre-line">{terms.terms?.text}</p>
        )}
        <div className="flex items-center gap-3 mt-6">
          <button
            type="button"
            disabled={disabled}
            onClick={onAccept}
            className="px-4 py-2 rounded-full text-sm font-semibold border-none bg-[var(--cs-primary)] text-white cursor-pointer hover:bg-[var(--cs-dark)] disabled:opacity-50"
          >
            {acceptLabel}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-sm font-semibold border border-gray-300 bg-transparent cursor-pointer hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
