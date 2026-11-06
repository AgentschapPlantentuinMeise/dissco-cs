import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { CsPage } from '../../components/layout/CsPage';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageBody } from '../../components/layout/PageBody';
import { HrefLink } from '../../utility/href-link';
import { forgotPassword } from '../../api/madoc-auth/auth';
import { inputClass } from '../../components/ui/input-styles';
import { isTooManyAttempts } from './auth-error';
import { FormField } from '../../components/ui/FormField';

export function ForgotPassword() {
  const { t } = useTranslation('dissco-cs');

  const [email, setEmail] = useState('');
  const request = useMutation({ mutationFn: () => forgotPassword({ email }), meta: { handlesOwnError: true } });

  // Any other failure shows the same message as success, so it never leaks whether the email
  // exists. The rate limit counts per IP, not per email, so saying so leaks nothing.
  const tooMany = request.isError && isTooManyAttempts(request.error);
  const sent = request.isSuccess || (request.isError && !tooMany);

  const submit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    request.mutate();
  };

  return (
    <CsPage>
      <PageBody width="narrow">
        <PageHeader
          variant="plain"
          title={t('forgot_password_title')}
          lead={!sent ? t('forgot_password_intro') : undefined}
        />

        {sent ? (
          <p>{t('forgot_password_success')}</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <FormField label={t('forgot_password_form_email')}>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
              />
            </FormField>

            {tooMany && <p className="text-red-700">{t('auth_error_too_many_attempts')}</p>}

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
    </CsPage>
  );
}
