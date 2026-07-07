import React from 'react';

export const ConfirmDialog: React.FC<{
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ message, confirmLabel, cancelLabel, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.2)] p-6 max-w-sm w-full"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-gray-800 mb-6">{message}</p>
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
      </div>
    </div>
  );
};
