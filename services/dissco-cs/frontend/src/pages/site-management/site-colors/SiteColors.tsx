import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuArrowLeft } from 'react-icons/lu';
import { SITE_COLOR_KEYS } from '@dissco-cs/shared-types';
import { CsPage } from '../../../components/layout/CsPage';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { SaveButton } from '../../../components/ui/SaveButton';
import { CancelButton } from '../../../components/ui/CancelButton';
import { HrefLink } from '../../../utility/href-link';
import { useSiteColors } from './use-site-colors';
import { ColorRow } from './ColorRow';
import { PalettePreview } from './PalettePreview';

export function SiteColors() {
  const { t } = useTranslation('dissco-cs');
  const { colors, isLoading, isDirty, isValid, hasOwnPalette, warnings, setColor, discard, save, reset } = useSiteColors();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide">
          <HrefLink href="/manage" className="inline-flex items-center gap-1 text-cs-primary no-underline font-medium hover:underline">
            <LuArrowLeft aria-hidden="true" /> {t('sm_back_to_hub')}
          </HrefLink>

          <h1 className="text-4xl text-cs-primary mt-4 mb-3">{t('sm_tile_colors_title')}</h1>
          <p className="text-gray-600 mb-8 max-w-[70ch]">{t('sm_colors_intro')}</p>

          {isLoading ? (
            <p className="text-center py-5">{t('loading_colors')}</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div>
                <ul className="list-none m-0 p-0 divide-y divide-gray-100 border-y border-gray-200 bg-white px-4">
                  {SITE_COLOR_KEYS.map(key => (
                    <ColorRow
                      key={key}
                      colorKey={key}
                      value={colors[key]}
                      contrast={warnings[key]}
                      onChange={value => setColor(key, value)}
                    />
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-3 mt-5">
                  <SaveButton onClick={() => save.mutate()} disabled={!isDirty || !isValid} loading={save.isPending} />
                  {isDirty && <CancelButton onClick={discard} />}
                  {hasOwnPalette && (
                    <button
                      type="button"
                      onClick={() => setConfirmReset(true)}
                      disabled={reset.isPending}
                      className="ml-auto bg-transparent border-none p-0 text-sm text-cs-primary underline underline-offset-2 cursor-pointer"
                    >
                      {t('sm_colors_reset')}
                    </button>
                  )}
                </div>
              </div>

              <PalettePreview colors={colors} />
            </div>
          )}
        </div>
      </div>

      {confirmReset && (
        <ConfirmDialog
          title={t('sm_colors_reset_confirm_title')}
          message={t('sm_colors_reset_confirm_message')}
          confirmLabel={t('sm_colors_reset')}
          cancelLabel={t('common_cancel')}
          onConfirm={() => {
            setConfirmReset(false);
            reset.mutate();
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </CsPage>
  );
}
