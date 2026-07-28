import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CloseIcon } from '../icons/CloseIcon';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  size?: 'md' | 'lg';
  children: React.ReactNode;
};

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  md: 'max-w-md',
  lg: 'max-w-xl',
};

// Generic modal shell (overlay + card), reused by ProjectManualModal — modeled after
// WelcomeModal.tsx's overlay/transition pattern but made reusable across content types.
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, eyebrow, size = 'md', children }) => {
  const { t } = useTranslation('dissco-cs');
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      // top-[70px]: houdt het centreer-gebied onder de vaste site-navbar (70px, z-200) i.p.v.
      // eroverheen -- anders kan een hoge kaart tegen/achter de navbar aan komen te zitten.
      className="fixed inset-x-0 bottom-0 top-[70px] z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={`relative flex w-full ${SIZE_CLASS[size]} max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_25px_60px_rgba(0,0,0,0.3)] transition-all duration-300 motion-reduce:transition-none ${
          entered ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {(title || eyebrow) && (
          <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-6 py-4">
            <div className="flex flex-col gap-0.5">
              {eyebrow && (
                <span className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--cs-secondary)]">{eyebrow}</span>
              )}
              {title && <h4 className="m-0 text-lg font-semibold text-[var(--cs-primary)]">{title}</h4>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common_close')}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-none bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200"
            >
              <CloseIcon />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
};
