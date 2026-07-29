import React from 'react';
import { Modal } from './Modal';

export const ConfirmDialog: React.FC<{
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ message, confirmLabel, cancelLabel, onConfirm, onCancel }) => {
  return (
    <Modal
      open
      onClose={onCancel}
      size="sm"
      footer={
        <div className="flex items-center gap-3">
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-full text-sm font-semibold border-none bg-[var(--cs-primary)] text-white cursor-pointer hover:bg-[var(--cs-dark)]"
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-sm font-semibold border border-gray-300 bg-transparent cursor-pointer hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
        </div>
      }
    >
      <p className="text-gray-800">{message}</p>
    </Modal>
  );
};
