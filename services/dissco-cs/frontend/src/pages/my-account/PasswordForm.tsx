import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NewPasswordFields } from '../../components/auth/NewPasswordFields';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { isNewPasswordValid } from '../../components/auth/password-requirements';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { SavedNotice } from '../../components/ui/SavedNotice';
import { authErrorKey } from '../auth/auth-error';

export function PasswordForm({ saving, saved, error, onSave }: {
  saving: boolean;
  saved: boolean;
  error: unknown;
  onSave: (input: { currentPassword: string; newPassword: string }, onDone: () => void) => void;
}) {
  const { t } = useTranslation('dissco-cs');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const canSubmit = !!currentPassword && isNewPasswordValid(newPassword, confirmPassword);

  const submit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSave({ currentPassword, newPassword }, () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 max-w-md">
      <FormField label={t('my_account_password_current')}>
        <PasswordInput required autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
      </FormField>
      <NewPasswordFields
        password={newPassword}
        confirmPassword={confirmPassword}
        onPasswordChange={setNewPassword}
        onConfirmPasswordChange={setConfirmPassword}
      />
      {!!error && <p className="text-red-700 m-0">{t(authErrorKey(error, 'my_account_password_error'))}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={!canSubmit} loading={saving}>
          {t('my_account_password_submit')}
        </Button>
        {saved && <SavedNotice>{t('my_account_password_saved')}</SavedNotice>}
      </div>
    </form>
  );
}
