import { useTranslation } from 'react-i18next';
import { LuCheck, LuCircle } from 'react-icons/lu';
import { FormField } from '../ui/FormField';
import { PasswordInput } from './PasswordInput';
import { getPasswordRequirements } from './password-requirements';

// The two fields for a new password, with its rules ticked off while typing.
export function NewPasswordFields({ password, confirmPassword, onPasswordChange, onConfirmPasswordChange }: {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
}) {
  const { t } = useTranslation('dissco-cs');

  return (
    <>
      <FormField label={t('set_password_form_password')}>
        <PasswordInput required autoComplete="new-password" value={password} onChange={e => onPasswordChange(e.target.value)} />
        {password && (
          <ul className="flex flex-col gap-0.5 mt-1">
            {getPasswordRequirements(password).map(req => (
              <li key={req.key} className={`text-sm flex items-center gap-1.5 ${req.met ? 'text-green-700' : 'text-gray-500'}`}>
                {req.met ? <LuCheck aria-hidden="true" /> : <LuCircle aria-hidden="true" />} {t(req.key)}
              </li>
            ))}
          </ul>
        )}
      </FormField>

      <FormField label={t('set_password_form_confirm')}>
        <PasswordInput required autoComplete="new-password" value={confirmPassword} onChange={e => onConfirmPasswordChange(e.target.value)} />
        {confirmPassword && confirmPassword !== password && (
          <span className="text-sm text-red-700">{t('set_password_error_mismatch')}</span>
        )}
      </FormField>
    </>
  );
}
