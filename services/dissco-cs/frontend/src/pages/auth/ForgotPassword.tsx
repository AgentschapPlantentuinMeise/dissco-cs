import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { CsPage } from '../../components/layout/CsPage';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageBody } from '../../components/layout/PageBody';
import { HrefLink } from '../../utility/href-link';
import { forgotPassword } from '../../api/madoc-auth/auth';
import { inputClass } from '../../components/ui/input-styles';

export function ForgotPassword() {
  const { t } = useTranslation('dissco-cs');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const submit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    try {
      await forgotPassword({ email });
    } finally {
      // Always show the same message, even on failure - never leak whether the email exists.
      setStatus('sent');
    }
  };

  return (
    <CsPage>
      <PageBody width="narrow">
        <PageHeader
          variant="plain"
          title={t('forgot_password_title')}
          lead={status !== 'sent' ? t('forgot_password_intro') : undefined}
        />

        {status === 'sent' ? (
          <p>{t('forgot_password_success')}</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">{t('forgot_password_form_email')}</span>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
              />
            </label>

            <div className="flex items-center justify-between mt-2">
              <HrefLink href="/login" className="text-sm text-gray-600 hover:text-cs-primary">
                {t('forgot_password_back_to_login')}
              </HrefLink>
              <Button
                type="submit"
                disabled={status === 'sending'}
              >
                {t('forgot_password_form_submit')}
              </Button>
            </div>
          </form>
        )}
      </PageBody>
    </CsPage>
  );
}
