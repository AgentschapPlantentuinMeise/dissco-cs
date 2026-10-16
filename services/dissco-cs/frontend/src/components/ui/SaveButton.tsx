import { useTranslation } from 'react-i18next';
import { Button } from './Button';

export function SaveButton({ onClick, disabled, loading, title }: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
}) {
  const { t } = useTranslation('dissco-cs');
  return (
    <Button variant="primary" size="sm" onClick={onClick} disabled={disabled} loading={loading} title={title}>
      {loading ? t('common_saving') : t('common_save')}
    </Button>
  );
}
