import React from 'react';
import { useTranslation } from 'react-i18next';
import { ToggleSwitch } from './ToggleSwitch';

export const ActiveToggleField: React.FC<{
  checked: boolean;
  onChange: () => void;
}> = ({ checked, onChange }) => {
  const { t } = useTranslation('dissco-cs');
  return (
    <label className="flex items-center gap-3 mb-6">
      <ToggleSwitch checked={checked} onChange={onChange} label={t('common_field_active')} />
      <span className="text-sm font-medium text-gray-700">{t('common_field_active')}</span>
    </label>
  );
};
