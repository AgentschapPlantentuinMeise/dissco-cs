import { useTranslation } from 'react-i18next';
import { DiscardGuard } from '../../hooks/use-discard-guard';
import { ConfirmDialog } from './ConfirmDialog';

export function DiscardDialog({ guard }: { guard: DiscardGuard }) {
  const { t } = useTranslation('dissco-cs');

  if (!guard.isAsking) return null;

  return (
    <ConfirmDialog
      title={t('common_discard_title')}
      message={t('common_discard_message')}
      confirmLabel={t('common_discard_confirm')}
      cancelLabel={t('common_discard_stay')}
      onConfirm={guard.confirm}
      onCancel={guard.cancel}
    />
  );
}
