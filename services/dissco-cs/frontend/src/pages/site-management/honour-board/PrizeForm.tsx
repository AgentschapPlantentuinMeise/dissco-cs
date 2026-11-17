import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HonourBoardPrizeDto,
  honourBoardPrizeSchema,
  MAX_HONOUR_BOARD_PRIZE_NOTE_LENGTH,
  MAX_HONOUR_BOARD_PRIZE_TITLE_LENGTH,
  SitePageLang,
} from '@dissco-cs/shared-types';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { FormField } from '../../../components/ui/FormField';
import { LanguageTabs } from '../../../components/ui/LanguageTabs';
import { SaveButton } from '../../../components/ui/SaveButton';
import { SavedNotice } from '../../../components/ui/SavedNotice';
import { inputClass } from '../../../components/ui/input-styles';
import { defaultLang } from '../../../utility/site-lang-text';

const EMPTY_PRIZE: HonourBoardPrizeDto = { title: {}, note: {} };

// The thank-you of one quarter: a title in every site language and an optional note.
export function PrizeForm({ saved, onSave, saving, isSaved, onDelete, deleting }: {
  saved: HonourBoardPrizeDto | null;
  // onSaved runs once the save succeeded, so the form shows what is saved again.
  onSave: (prize: HonourBoardPrizeDto, onSaved: () => void) => void;
  saving: boolean;
  isSaved: boolean;
  onDelete: () => void;
  deleting: boolean;
}) {
  const { t, i18n } = useTranslation('dissco-cs');
  const [selectedLang, setSelectedLang] = useState<SitePageLang>(defaultLang(i18n.language));
  // null while nothing was changed: the form then shows what is saved.
  const [draft, setDraft] = useState<HonourBoardPrizeDto | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const prize = draft ?? saved ?? EMPTY_PRIZE;
  const canSave = draft !== null && honourBoardPrizeSchema.safeParse(prize).success;

  // An empty note is left out: the schema accepts a missing language, not an empty one.
  const setText = (field: keyof HonourBoardPrizeDto, value: string) => {
    const others = Object.fromEntries(Object.entries(prize[field]).filter(([lang]) => lang !== selectedLang));
    setDraft({ ...prize, [field]: value ? { ...others, [selectedLang]: value } : others });
  };

  return (
    <div className="flex flex-col gap-3">
      <LanguageTabs selected={selectedLang} onSelect={setSelectedLang} isMissing={lang => !prize.title[lang]?.trim()} />
      <FormField label={t('sm_honour_board_prize_title')}>
        <input
          type="text"
          value={prize.title[selectedLang] ?? ''}
          onChange={e => setText('title', e.target.value)}
          maxLength={MAX_HONOUR_BOARD_PRIZE_TITLE_LENGTH}
          className={inputClass}
        />
      </FormField>
      <FormField label={t('sm_honour_board_prize_note')}>
        <textarea
          value={prize.note[selectedLang] ?? ''}
          onChange={e => setText('note', e.target.value)}
          maxLength={MAX_HONOUR_BOARD_PRIZE_NOTE_LENGTH}
          className={`${inputClass} min-h-[70px]`}
        />
      </FormField>
      <div className="flex flex-wrap items-center gap-3">
        <SaveButton
          onClick={() => onSave(prize, () => setDraft(null))}
          loading={saving}
          disabled={!canSave}
          title={draft !== null && !canSave ? t('common_fill_required_fields') : undefined}
        />
        {saved && draft === null && (
          <Button variant="secondary" size="sm" loading={deleting} onClick={() => setConfirmingDelete(true)}>
            {t('sm_honour_board_prize_delete')}
          </Button>
        )}
        {isSaved && draft === null && <SavedNotice />}
      </div>
      {confirmingDelete && (
        <ConfirmDialog
          title={t('sm_honour_board_prize_delete')}
          message={t('sm_honour_board_prize_delete_confirm')}
          confirmLabel={t('common_delete')}
          cancelLabel={t('common_cancel')}
          onConfirm={() => {
            setConfirmingDelete(false);
            onDelete();
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
