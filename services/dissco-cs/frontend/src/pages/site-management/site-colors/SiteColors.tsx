import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SITE_COLOR_KEYS } from '@dissco-cs/shared-types';
import { CsPage } from '../../../components/layout/CsPage';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageBody } from '../../../components/layout/PageBody';
import { ManageLoadError } from '../ManageLoadError';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { SaveButton } from '../../../components/ui/SaveButton';
import { SavedNotice } from '../../../components/ui/SavedNotice';
import { CancelButton } from '../../../components/ui/CancelButton';
import { DiscardDialog } from '../../../components/ui/DiscardDialog';
import { useDiscardGuard } from '../../../hooks/use-discard-guard';
import { Button } from '../../../components/ui/Button';
import { useSiteColors } from './use-site-colors';
import { ColorRow } from './ColorRow';
import { PalettePreview } from './PalettePreview';

export function SiteColors() {
  const { t } = useTranslation('dissco-cs');
  const { colors, isLoading, isError, isDirty, isValid, hasOwnPalette, warnings, setColor, discard, save, reset } = useSiteColors();
  const discardGuard = useDiscardGuard(isDirty);
  const [confirmReset, setConfirmReset] = useState(false);

  // The form would show the default palette, and saving it would replace the site's own colors.
  if (isError) {
    return <ManageLoadError />;
  }

  return (
    <CsPage>
      <PageBody>
        <PageHeader variant="plain" back={{ href: '/manage', label: t('sm_back_to_hub') }} title={t('sm_tile_colors_title')} lead={t('sm_colors_intro')} />

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
                {isDirty && <CancelButton onClick={() => discardGuard.guard(discard)} />}
                {save.isSuccess && !isDirty && <SavedNotice />}
                {hasOwnPalette && (
                  <Button variant="text" size="sm" className="ml-auto" onClick={() => setConfirmReset(true)} loading={reset.isPending}>
                    {t('sm_colors_reset')}
                  </Button>
                )}
              </div>
            </div>

            <PalettePreview colors={colors} />
          </div>
        )}
      </PageBody>

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

      <DiscardDialog guard={discardGuard} />
    </CsPage>
  );
}
