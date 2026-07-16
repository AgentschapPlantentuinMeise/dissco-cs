import React from 'react';
import { useTranslation } from 'react-i18next';
import { ToggleSwitch } from './ToggleSwitch';

export const ActiveStatusToggle: React.FC<{
  active: boolean;
  onChange: () => void;
  label: string;
  labelWidthClassName?: string;
}> = ({ active, onChange, label, labelWidthClassName = 'w-16 text-right' }) => {
  const { t } = useTranslation('dissco-cs');
  return (
    <>
      <span className={`text-xs text-gray-500 ${labelWidthClassName}`}>
        {active ? t('common_active') : t('common_inactive')}
      </span>
      <ToggleSwitch checked={active} onChange={onChange} label={label} />
    </>
  );
};
