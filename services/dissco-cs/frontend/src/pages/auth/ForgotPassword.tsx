import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { CsPage } from '../../components/layout/CsPage';
import { HrefLink } from '../../utility/href-link';
import { forgotPassword } from '../../api/madoc-auth/auth';

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
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container max-w-md">
          <header className="mb-8">
            <h1 className="text-4xl text-cs-primary mb-3">{t('forgot_password_title')}</h1>
            {status !== 'sent' && <p className="text-lg text-gray-600">{t('forgot_password_intro')}</p>}
          </header>

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
                  className="border border-gray-300 rounded-lg p-2"
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
        </div>
      </div>
    </CsPage>
  );
}
