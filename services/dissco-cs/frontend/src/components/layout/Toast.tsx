import { useTranslation } from 'react-i18next';
import { LuCircleAlert, LuX } from 'react-icons/lu';
import { useToast } from '../../hooks/use-toast';

// The error message band at the bottom of the screen (direction A of the toast mockup). Errors
// only; it stays until closed. Rendered once, in main.tsx.
export function Toast() {
  const { t } = useTranslation('dissco-cs');
  const { toast, close } = useToast();

  if (!toast) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] z-[1000] flex justify-center px-4 pointer-events-none">
      <div
        key={toast.id}
        role="alert"
        className="pointer-events-auto flex items-start gap-2.5 w-full max-w-[520px] rounded bg-cs-dark text-white text-sm leading-snug py-3 pl-4 pr-3 border-b-[3px] border-[#e08f7f] shadow-lg"
      >
        <LuCircleAlert className="flex-shrink-0 mt-px text-[#f2b3a6]" size={20} aria-hidden="true" />
        <span className="flex-1 min-w-0">{t(toast.key)}</span>
        <button
          type="button"
          onClick={close}
          aria-label={t('common_close')}
          title={t('common_close')}
          className="flex-shrink-0 p-0.5 bg-transparent border-none text-white/75 hover:text-white cursor-pointer"
        >
          <LuX size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
