import { useTranslation } from 'react-i18next';
import { LuArrowDown, LuArrowUp } from 'react-icons/lu';
import { IconButton } from './IconButton';

// Moves an item of an ordered list one place up or down; the first cannot go up, the last not down.
export function MoveButtons({ index, count, onMove }: {
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
}) {
  const { t } = useTranslation('dissco-cs');
  return (
    <span className="flex items-center">
      <IconButton icon={LuArrowUp} label={t('sm_pages_move_up')} onClick={() => onMove(-1)} disabled={index === 0} />
      <IconButton icon={LuArrowDown} label={t('sm_pages_move_down')} onClick={() => onMove(1)} disabled={index === count - 1} />
    </span>
  );
}
