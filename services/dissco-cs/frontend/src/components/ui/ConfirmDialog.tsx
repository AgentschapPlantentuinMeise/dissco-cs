import { Modal } from './Modal';
import { Button } from './Button';
import { LuTriangleAlert, LuCheck } from 'react-icons/lu';

export function ConfirmDialog({ title, message, confirmLabel, cancelLabel, tone = 'warn', onConfirm, onCancel }: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: 'warn' | 'affirm';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const toneColor = tone === 'affirm' ? 'text-cs-secondary' : 'text-red-600';

  return (
    <Modal
      open
      onClose={onCancel}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'affirm' ? 'primary' : 'danger'} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
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
}
