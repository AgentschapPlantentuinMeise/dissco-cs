import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_USER_NAME_LENGTH } from '@dissco-cs/shared-types';
import { FormField } from '../../components/ui/FormField';
import { SaveButton } from '../../components/ui/SaveButton';
import { SavedNotice } from '../../components/ui/SavedNotice';
import { inputClass } from '../../components/ui/input-styles';

export function NameForm({ currentName, saving, saved, onSave }: {
  currentName: string;
  saving: boolean;
  saved: boolean;
  onSave: (name: string) => void;
}) {
  const { t } = useTranslation('dissco-cs');
  const [name, setName] = useState(currentName);
  const trimmed = name.trim();
  const isChanged = trimmed !== currentName;

  return (
    <div className="flex flex-col gap-4 max-w-md">
      <FormField label={t('my_account_name_label')}>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={MAX_USER_NAME_LENGTH} autoComplete="name" className={inputClass} />
      </FormField>
      <div className="flex items-center gap-3">
        <SaveButton onClick={() => onSave(trimmed)} disabled={!trimmed || !isChanged} loading={saving} />
        {saved && !isChanged && <SavedNotice />}
      </div>
    </div>
  );
}
