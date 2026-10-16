import { useTranslation } from 'react-i18next';

export function CancelButton({ onClick }: {
  onClick: () => void;
}) {
  const { t } = useTranslation('dissco-cs');
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-full text-sm font-semibold border border-gray-300 bg-transparent cursor-pointer hover:bg-gray-50"
    >
      {t('common_cancel')}
    </button>
  );
}
