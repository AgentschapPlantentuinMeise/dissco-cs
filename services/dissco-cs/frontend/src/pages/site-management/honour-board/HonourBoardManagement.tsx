import { useTranslation } from 'react-i18next';
import { CsPage } from '../../../components/layout/CsPage';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageBody } from '../../../components/layout/PageBody';
import { failedToLoad } from '../../../api/query-state';
import { ManageLoadError } from '../ManageLoadError';
import { HonourBoardSettingsForm } from './HonourBoardSettingsForm';
import { QuarterManagement } from './QuarterManagement';
import { useHonourBoardManagement } from './use-honour-board-management';

// The quarter pool: how the site uses it and its threshold, and per recent quarter the thank-you
// and the winner.
export function HonourBoardManagement() {
  const { t } = useTranslation('dissco-cs');
  const { settingsQuery, saveSettings, quarters } = useHonourBoardManagement();
  const settings = settingsQuery.data;

  // Saving writes mode and threshold together, so the form must never start from defaults.
  if (failedToLoad(settingsQuery)) {
    return <ManageLoadError />;
  }

  return (
    <CsPage>
      <PageBody>
        <PageHeader
          variant="plain"
          back={{ href: '/manage', label: t('sm_back_to_hub') }}
          title={t('sm_honour_board_title')}
          lead={t('sm_honour_board_intro')}
        />

        {!settings ? (
          <p className="text-sm text-gray-500">{t('card_loading')}</p>
        ) : (
          <div className="flex flex-col gap-8">
            <HonourBoardSettingsForm
              saved={settings}
              onSave={(next, onSaved) => saveSettings.mutate(next, { onSuccess: onSaved })}
              saving={saveSettings.isPending}
              isSaved={saveSettings.isSuccess}
            />

            {settings.mode !== 'off' && (
              <section className="flex flex-col gap-3">
                <h2 className="m-0 text-lg font-semibold text-gray-900">{t('sm_honour_board_quarters')}</h2>
                <p className="m-0 text-sm text-gray-600">
                  {t(settings.mode === 'prize' ? 'sm_honour_board_quarters_intro_prize' : 'sm_honour_board_quarters_intro_recognition')}
                </p>
                {quarters.map(quarter => (
                  <QuarterManagement key={quarter} quarter={quarter} mode={settings.mode} />
                ))}
              </section>
            )}
          </div>
        )}
      </PageBody>
    </CsPage>
  );
}
