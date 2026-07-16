import React from 'react';
import { useTranslation } from 'react-i18next';

export const CancelButton: React.FC<{
  onClick: () => void;
}> = ({ onClick }) => {
  const { t } = useTranslation('dissco-cs');
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-full text-sm font-semibold border border-gray-300 bg-transparent cursor-pointer hover:bg-gray-50"
    >
      {t('common_cancel')}
    </button>
  );
};
