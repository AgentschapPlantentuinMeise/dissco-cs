import { useTranslation } from 'react-i18next';
import { LuTrash2 } from 'react-icons/lu';
import { IconButton } from './IconButton';

export function DeleteIconButton({ onClick }: {
  onClick: () => void;
}) {
  const { t } = useTranslation('dissco-cs');
  return <IconButton icon={LuTrash2} label={t('common_delete')} onClick={onClick} />;
}
