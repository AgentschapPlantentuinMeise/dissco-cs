import React from 'react';
import { useTranslation } from 'react-i18next';

export const SaveButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}> = ({ onClick, disabled, title }) => {
  const { t } = useTranslation('dissco-cs');
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-4 py-2 rounded-full text-sm font-semibold border-none ${
        disabled
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-[var(--cs-primary)] text-white cursor-pointer hover:bg-[var(--cs-dark)]'
      }`}
    >
      {t('common_save')}
    </button>
  );
};
