import React from 'react';
import { CsMarkdown } from '../ui/CsMarkdown';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { MadocSiteTermsDto } from '@dissco-cs/shared-types';

type TermsModalProps = {
  title: string;
  intro?: React.ReactNode;
  terms: MadocSiteTermsDto;
  acceptLabel: string;
  cancelLabel: string;
  onAccept: () => void;
  onCancel: () => void;
  disabled?: boolean;
};

// Shared by Register.tsx (review terms before creating an account) and Login.tsx
// (re-accept terms that changed since the user's last acceptance).
export function TermsModal({
  title,
  intro,
  terms,
  acceptLabel,
  cancelLabel,
  onAccept,
  onCancel,
  disabled,
}: TermsModalProps) {
  return (
    <Modal
      open
      onClose={onCancel}
      title={title}
      size="lg"
      coverNavbar
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" size="sm" disabled={disabled} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button size="sm" disabled={disabled} onClick={onAccept}>
            {acceptLabel}
          </Button>
        </div>
      }
    >
      {intro && <p className="text-base text-gray-600 mb-4">{intro}</p>}
      {terms.terms?.markdown ? (
        <CsMarkdown content={terms.terms.markdown} />
      ) : (
        <p className="text-gray-800 whitespace-pre-line">{terms.terms?.text}</p>
      )}
    </Modal>
  );
}
