import { useTranslation } from 'react-i18next';
import { LuTriangleAlert } from 'react-icons/lu';
import { SiteColorKey } from '@dissco-cs/shared-types';
import { isHexColor, MIN_CONTRAST } from './palette';

export function ColorRow({ colorKey, value, contrast, onChange }: {
  colorKey: SiteColorKey;
  value: string;
  contrast?: number;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation('dissco-cs');
  const name = t(`sm_colors_name_${colorKey}`);
  const valid = isHexColor(value);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <input
        type="color"
        value={valid ? value : '#000000'}
        onChange={e => onChange(e.target.value)}
        aria-label={t('sm_colors_picker_label', { name })}
        className="h-10 w-14 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
      />
      <div className="min-w-0 flex-1">
        <p className="m-0 font-semibold text-gray-900">{name}</p>
        <p className="m-0 text-sm text-gray-600">{t(`sm_colors_role_${colorKey}`)}</p>
        {contrast !== undefined && (
          <p className="m-0 mt-1 flex items-center gap-1.5 text-sm text-amber-700">
            <LuTriangleAlert aria-hidden="true" className="flex-shrink-0" />
            {t('sm_colors_contrast_warning', { ratio: contrast.toFixed(1), min: MIN_CONTRAST })}
          </p>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value.trim())}
        aria-label={t('sm_colors_hex_label', { name })}
        aria-invalid={!valid}
        spellCheck={false}
        className={`w-28 rounded border px-3 py-2 font-mono text-sm ${valid ? 'border-gray-300' : 'border-red-500'}`}
      />
    </li>
  );
}
