import { useTranslation } from 'react-i18next';
import { Button } from './Button';

export function CancelButton({ onClick }: {
  onClick: () => void;
}) {
  const { t } = useTranslation('dissco-cs');
  return (
    <Button variant="secondary" size="sm" onClick={onClick}>
      {t('common_cancel')}
    </Button>
  );
}
