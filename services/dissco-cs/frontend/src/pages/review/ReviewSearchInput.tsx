import { useTranslation } from 'react-i18next';
import { LuX } from 'react-icons/lu';
import { IconButton } from '../../components/ui/IconButton';
import { inputClass } from '../../components/ui/input-styles';

interface ReviewSearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function ReviewSearchInput({ value, onChange }: ReviewSearchInputProps) {
  const { t } = useTranslation('dissco-cs');
  return (
    <div className="relative flex-1 min-w-[200px]">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={t('review_search_placeholder')}
        className={`${inputClass} w-full pr-8`}
      />
      {value && (
        <IconButton icon={LuX} label={t('common_close')} onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2" />
      )}
    </div>
  );
}
