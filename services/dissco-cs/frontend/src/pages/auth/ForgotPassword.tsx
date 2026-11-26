import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageBody } from '../../components/layout/PageBody';
import { HrefLink } from '../../utility/href-link';
import { forgotPassword } from '../../api/madoc-auth/auth';
import { inputClass } from '../../components/ui/input-styles';
import { isTooManyAttempts } from './auth-error';
import { FormField } from '../../components/ui/FormField';
import { FormError } from '../../components/ui/FormError';
import { useValidatedForm } from '../../hooks/use-validated-form';
import { z } from 'zod';
import { emailSchema } from '@dissco-cs/shared-types';

const forgotPasswordSchema = z.object({ email: emailSchema });

export function ForgotPassword() {
  const { t } = useTranslation('dissco-cs');

  const form = useValidatedForm(forgotPasswordSchema, { email: '' });
  const request = useMutation({
    mutationFn: (values: { email: string }) => forgotPassword(values),
    meta: { handlesOwnError: true },
  });

  // Any other failure shows the same message as success, so it never leaks whether the email
  // exists. The rate limit counts per IP, not per email, so saying so leaks nothing.
  const tooMany = request.isError && isTooManyAttempts(request.error);
  const sent = request.isSuccess || (request.isError && !tooMany);

  const submit = form.handleSubmit(values => request.mutate(values));

  return (
    <PageBody width="narrow">
      <PageHeader
        variant="plain"
        title={t('forgot_password_title')}
        lead={!sent ? t('forgot_password_intro') : undefined}
      />

      {sent ? (
        <p>{t('forgot_password_success')}</p>
      ) : (
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          <FormField label={t('forgot_password_form_email')} error={form.errorFor('email')}>
            <input {...form.field('email')} type="email" autoComplete="email" className={inputClass} />
          </FormField>

          {tooMany && <FormError>{t('auth_error_too_many_attempts')}</FormError>}

          <div className="flex items-center justify-between mt-2">
            <HrefLink href="/login" className="text-sm text-gray-600 hover:text-cs-primary">
              {t('forgot_password_back_to_login')}
            </HrefLink>
            <Button type="submit" loading={request.isPending}>
              {t('forgot_password_form_submit')}
            </Button>
          </div>
        </form>
      )}
    </PageBody>
  );
}
