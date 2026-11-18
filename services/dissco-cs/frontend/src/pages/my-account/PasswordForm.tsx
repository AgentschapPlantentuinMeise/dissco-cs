import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { NewPasswordFields } from '../../components/auth/NewPasswordFields';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { isNewPasswordValid, withNewPasswordRules } from '../../components/auth/password-requirements';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { FormError } from '../../components/ui/FormError';
import { SavedNotice } from '../../components/ui/SavedNotice';
import { useValidatedForm } from '../../hooks/use-validated-form';
import { authErrorKey } from '../auth/auth-error';

const changePasswordSchema = withNewPasswordRules(
  z.object({ currentPassword: z.string().min(1), password: z.string(), confirmPassword: z.string() })
);

export function PasswordForm({ saving, saved, error, onSave }: {
  saving: boolean;
  saved: boolean;
  error: unknown;
  onSave: (input: { currentPassword: string; newPassword: string }, onDone: () => void) => void;
}) {
  const { t } = useTranslation('dissco-cs');
  const form = useValidatedForm(changePasswordSchema, { currentPassword: '', password: '', confirmPassword: '' });
  const [currentPassword, password, confirmPassword] = form.watch(['currentPassword', 'password', 'confirmPassword']);
  const canSubmit = !!currentPassword && isNewPasswordValid(password, confirmPassword);

  const submit = form.handleSubmit(values =>
    onSave({ currentPassword: values.currentPassword, newPassword: values.password }, () => form.reset())
  );

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4 max-w-md">
      <FormField label={t('my_account_password_current')} error={form.errorFor('currentPassword')}>
        <PasswordInput {...form.field('currentPassword')} autoComplete="current-password" />
      </FormField>
      <NewPasswordFields
        password={password}
        passwordProps={form.field('password', { deps: 'confirmPassword' })}
        passwordError={form.errorFor('password')}
        confirmProps={form.field('confirmPassword')}
        confirmError={form.errorFor('confirmPassword')}
      />
      {!!error && <FormError>{t(authErrorKey(error, 'my_account_password_error'))}</FormError>}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={!canSubmit} loading={saving}>
          {t('my_account_password_submit')}
        </Button>
        {saved && !form.formState.isDirty && <SavedNotice>{t('my_account_password_saved')}</SavedNotice>}
      </div>
    </form>
  );
}
