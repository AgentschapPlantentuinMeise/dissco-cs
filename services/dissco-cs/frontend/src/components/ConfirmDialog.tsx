import React from 'react';
import { Modal } from './Modal';
import { LuTriangleAlert, LuCheck } from 'react-icons/lu';

export const ConfirmDialog: React.FC<{
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: 'warn' | 'affirm';
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ title, message, confirmLabel, cancelLabel, tone = 'warn', onConfirm, onCancel }) => {
  const toneColor = tone === 'affirm' ? 'text-[var(--cs-secondary)]' : 'text-red-600';
  const confirmButtonColor =
    tone === 'affirm'
      ? 'bg-[var(--cs-secondary)] hover:brightness-90'
      : 'bg-red-600 hover:bg-red-700';

  return (
    <Modal
      open
      onClose={onCancel}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-sm font-semibold border border-gray-300 bg-transparent cursor-pointer hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-full text-sm font-semibold border-none text-white cursor-pointer ${confirmButtonColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className={`flex items-center gap-2 mb-2 ${toneColor}`}>
        {tone === 'affirm' ? <LuCheck /> : <LuTriangleAlert />}
        <h4 className="m-0 text-base font-bold text-gray-900">{title}</h4>
      </div>
      <p className="text-sm leading-relaxed text-gray-600">{message}</p>
    </Modal>
  );
};
