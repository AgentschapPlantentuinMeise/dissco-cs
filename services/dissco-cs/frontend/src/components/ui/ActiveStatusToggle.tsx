import { useTranslation } from 'react-i18next';
import { ToggleSwitch } from './ToggleSwitch';

export function ActiveStatusToggle({ active, onChange, label, labelWidthClassName = 'w-16 text-right' }: {
  active: boolean;
  onChange: () => void;
  label: string;
  labelWidthClassName?: string;
}) {
  const { t } = useTranslation('dissco-cs');
  return (
    <>
      <span className={`text-xs text-gray-500 ${labelWidthClassName}`}>
        {active ? t('common_active') : t('common_inactive')}
      </span>
      <ToggleSwitch checked={active} onChange={onChange} label={label} />
    </>
  );
}
