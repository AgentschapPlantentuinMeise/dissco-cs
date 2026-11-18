import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HONOUR_BOARD_MODES, HonourBoardSettingsDto, honourBoardSettingsSchema, MAX_HONOUR_BOARD_THRESHOLD } from '@dissco-cs/shared-types';
import { FormField } from '../../../components/ui/FormField';
import { SaveButton } from '../../../components/ui/SaveButton';
import { SavedNotice } from '../../../components/ui/SavedNotice';
import { inputClass } from '../../../components/ui/input-styles';
import { panelClass } from '../../../components/ui/panel-styles';
import { SaveHint } from '../../../components/ui/SaveHint';

// How the site uses the quarter pool, and the one threshold for every quarter.
export function HonourBoardSettingsForm({ saved, onSave, saving, isSaved }: {
  saved: HonourBoardSettingsDto;
  // onSaved runs once the save succeeded, so the form shows what is saved again.
  onSave: (settings: HonourBoardSettingsDto, onSaved: () => void) => void;
  saving: boolean;
  isSaved: boolean;
}) {
  const { t } = useTranslation('dissco-cs');
  // null while nothing was changed: the form then shows what is saved.
  const [draft, setDraft] = useState<HonourBoardSettingsDto | null>(null);
  const settings = draft ?? saved;
  const canSave = draft !== null && honourBoardSettingsSchema.safeParse(settings).success;

  return (
    <div className={`${panelClass} flex flex-col gap-5`}>
      <fieldset className="m-0 p-0 border-0 flex flex-col gap-2.5">
        <legend className="text-sm font-medium text-gray-700 mb-1.5">{t('sm_honour_board_mode')}</legend>
        {HONOUR_BOARD_MODES.map(mode => (
          <label key={mode} className="flex items-start gap-2.5 cursor-pointer">
            <input type="radio" className="mt-1" checked={settings.mode === mode} onChange={() => setDraft({ ...settings, mode })} />
            <span className="flex flex-col">
              <span className="text-[0.95rem] font-semibold text-gray-900">{t(`sm_honour_board_mode_${mode}`)}</span>
              <span className="text-sm text-gray-600">{t(`sm_honour_board_mode_${mode}_desc`)}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {settings.mode !== 'off' && (
        <div className="flex flex-col gap-1.5">
          <FormField label={t('sm_honour_board_threshold')} className="max-w-[12rem]">
            <input
              type="number"
              min={1}
              max={MAX_HONOUR_BOARD_THRESHOLD}
              value={Number.isNaN(settings.threshold) ? '' : settings.threshold}
              onChange={e => setDraft({ ...settings, threshold: e.target.valueAsNumber })}
              className={inputClass}
            />
          </FormField>
          <p className="m-0 text-sm text-gray-600">{t('sm_honour_board_threshold_note')}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton
          onClick={() => onSave(settings, () => setDraft(null))}
          loading={saving}
          disabled={!canSave}
        />
        {draft !== null && !canSave && <SaveHint>{t('sm_honour_board_threshold_invalid', { max: MAX_HONOUR_BOARD_THRESHOLD })}</SaveHint>}
        {isSaved && draft === null && <SavedNotice />}
      </div>
    </div>
  );
}
