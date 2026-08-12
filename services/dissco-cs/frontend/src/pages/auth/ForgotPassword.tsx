import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CsPage } from '../../components/CsPage';
import { HrefLink } from '../../utility/href-link';
import { madocClient } from '../../api/madoc-client';

export const ForgotPassword: React.FC = () => {
  const { t } = useTranslation('dissco-cs');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      await madocClient.forgotPassword({ email });
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
            <h1 className="text-4xl text-[var(--cs-primary)] mb-3">{t('forgot_password_title')}</h1>
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
                <HrefLink href="/login" className="text-sm text-gray-600 hover:text-[var(--cs-primary)]">
                  {t('forgot_password_back_to_login')}
                </HrefLink>
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="bg-[var(--cs-primary)] text-white px-5 py-2 rounded-full text-sm font-semibold border-none cursor-pointer hover:bg-[var(--cs-dark)] disabled:opacity-50"
                >
                  {t('forgot_password_form_submit')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </CsPage>
  );
};
