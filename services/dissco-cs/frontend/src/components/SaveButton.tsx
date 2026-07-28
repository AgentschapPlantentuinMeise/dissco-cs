import React from 'react';
import { useTranslation } from 'react-i18next';

export const SaveButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
}> = ({ onClick, disabled, loading, title }) => {
  const { t } = useTranslation('dissco-cs');
  const isDisabled = disabled || loading;
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      title={title}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-none ${
        isDisabled
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-[var(--cs-primary)] text-white cursor-pointer hover:bg-[var(--cs-dark)]'
      }`}
    >
      {loading && (
        <span className="h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {loading ? t('common_saving') : t('common_save')}
    </button>
  );
};
