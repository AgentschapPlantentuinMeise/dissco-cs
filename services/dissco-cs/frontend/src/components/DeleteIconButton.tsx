import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from '../icons/TrashIcon';

export const DeleteIconButton: React.FC<{
  onClick: () => void;
}> = ({ onClick }) => {
  const { t } = useTranslation('dissco-cs');
  return (
    <button
      onClick={onClick}
      aria-label={t('common_delete')}
      title={t('common_delete')}
      className="bg-transparent border-none cursor-pointer text-gray-600 text-base px-1 flex items-center hover:text-[var(--cs-primary)] transition-colors duration-200"
    >
      <TrashIcon />
    </button>
  );
};
