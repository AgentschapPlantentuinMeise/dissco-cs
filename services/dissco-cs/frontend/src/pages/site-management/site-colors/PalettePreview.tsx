import { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { SITE_COLOR_KEYS, SiteColors } from '@dissco-cs/shared-types';
import { isHexColor } from './palette';

// Shows the palette on a few typical parts. The variables are set on this box only, so the rest of
// the page keeps the saved palette until the admin saves.
export function PalettePreview({ colors }: { colors: SiteColors }) {
  const { t } = useTranslation('dissco-cs');
  const style = Object.fromEntries(
    SITE_COLOR_KEYS.filter(key => isHexColor(colors[key])).map(key => [`--cs-${key}`, colors[key]])
  ) as CSSProperties;

  return (
    <section style={style} aria-label={t('sm_colors_preview')} className="overflow-hidden rounded border border-gray-200 bg-white">
      <div className="bg-gradient-to-r from-cs-primary to-cs-accent border-b-[3px] border-cs-dark px-6 py-6 text-white">
        <p className="m-0 text-2xl font-light">{t('sm_colors_preview_title')}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded bg-cs-secondary px-4 py-2 text-sm font-semibold">{t('sm_colors_preview_cta')}</span>
          <span className="rounded border-2 border-white/75 px-4 py-2 text-sm font-semibold">{t('sm_colors_preview_more')}</span>
        </div>
      </div>
      <div className="flex flex-col gap-4 px-6 py-5">
        <p className="m-0 text-xl text-cs-primary">{t('sm_colors_preview_heading')}</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded bg-cs-primary px-4 py-2 text-sm font-semibold text-white">{t('sm_colors_preview_primary_button')}</span>
          <span className="rounded border-2 border-cs-primary px-4 py-2 text-sm font-semibold text-cs-primary">
            {t('sm_colors_preview_secondary_button')}
          </span>
          <span className="text-cs-primary underline underline-offset-2">{t('sm_colors_preview_link')}</span>
          <span className="rounded-full bg-cs-tertiary px-2.5 py-0.5 text-xs font-bold text-white">{t('sm_colors_preview_badge')}</span>
        </div>
        <div className="h-2 overflow-hidden rounded bg-gray-200">
          <div className="h-full w-2/3 bg-cs-primary" />
        </div>
      </div>
    </section>
  );
}
