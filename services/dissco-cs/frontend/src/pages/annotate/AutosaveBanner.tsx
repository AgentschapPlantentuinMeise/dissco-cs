import { useTranslation } from 'react-i18next';

// Shown once the first autosave landed: the task is now on the user's name, with a way to let go.
export function AutosaveBanner({ onRelease }: { onRelease: () => void }) {
  const { t } = useTranslation('dissco-cs');

  return (
    <div className="px-4 py-2 bg-sky-50 border-b border-sky-200 text-sky-800 text-[0.85rem] flex-shrink-0 flex items-center justify-between gap-2">
      <span>{t('annotate_autosaved_banner')}</span>
      <button className="text-[var(--cs-primary)] underline whitespace-nowrap" onClick={onRelease}>
        {t('annotate_release_task')}
      </button>
    </div>
  );
}
