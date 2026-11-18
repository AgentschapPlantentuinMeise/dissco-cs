import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuCheck, LuCircle } from 'react-icons/lu';
import { FormField } from '../ui/FormField';
import { PasswordInput } from './PasswordInput';
import { getPasswordRequirements } from './password-requirements';

type InputProps = React.ComponentProps<'input'>;

// The two fields for a new password, with its rules ticked off while typing. The form owns the
// values: it passes each field's props (useValidatedForm's field()) and messages (errorFor()).
export function NewPasswordFields({ password, passwordProps, passwordError, confirmProps, confirmError }: {
  password: string;
  passwordProps: InputProps;
  passwordError?: string;
  confirmProps: InputProps;
  confirmError?: string;
}) {
  const { t } = useTranslation('dissco-cs');

  return (
    <>
      <FormField label={t('set_password_form_password')} error={passwordError}>
        <PasswordInput {...passwordProps} autoComplete="new-password" />
        {password && (
          <ul className="flex flex-col gap-0.5 mt-1">
            {getPasswordRequirements(password).map(req => (
              <li key={req.key} className={`text-sm flex items-center gap-1.5 ${req.met ? 'text-success-700' : 'text-gray-500'}`}>
                {req.met ? <LuCheck aria-hidden="true" /> : <LuCircle aria-hidden="true" />} {t(req.key)}
              </li>
            ))}
          </ul>
        )}
      </FormField>

      <FormField label={t('set_password_form_confirm')} error={confirmError}>
        <PasswordInput {...confirmProps} autoComplete="new-password" />
      </FormField>
    </>
  );
}
