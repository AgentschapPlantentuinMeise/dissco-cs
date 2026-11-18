import { useTranslation } from 'react-i18next';
import { Button } from './Button';

// Why a disabled save button is off goes next to it in a SaveHint, not in a tooltip: hence no title.
export function SaveButton({ onClick, disabled, loading }: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { t } = useTranslation('dissco-cs');
  return (
    <Button variant="primary" size="sm" onClick={onClick} disabled={disabled} loading={loading}>
      {loading ? t('common_saving') : t('common_save')}
    </Button>
  );
}
