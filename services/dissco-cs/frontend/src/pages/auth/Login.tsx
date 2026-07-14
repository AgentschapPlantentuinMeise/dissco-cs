import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CsPage } from '../../components/CsPage';
import { HrefLink } from '../../utility/href-link';
import { madocClient } from '../../api/madoc-client';

export const Login: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      await madocClient.login({ email, password });
      const redirect = searchParams.get('redirect');
      window.location.href = redirect && redirect.startsWith('/') ? redirect : '/';
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : t('login_form_error'));
    }
  };

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container max-w-md">
          <header className="mb-6">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-4">{t('login_title')}</h1>
            <p className="text-base text-gray-600">
              {t('login_no_account')}{' '}
              <HrefLink href="/register" className="text-[var(--cs-primary)]">
                {t('login_register_link')}
              </HrefLink>
            </p>
          </header>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">{t('login_form_email')}</span>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="border border-gray-300 rounded-lg p-2"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">{t('login_form_password')}</span>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="border border-gray-300 rounded-lg p-2"
              />
            </label>

            {status === 'error' && <p className="text-red-700">{error}</p>}

            <div className="flex items-center justify-between mt-2">
              <HrefLink href="/forgot-password" className="text-sm text-gray-600 hover:text-[var(--cs-primary)]">
                {t('login_forgot_password_link')}
              </HrefLink>
              <button
                type="submit"
                disabled={status === 'sending'}
                className="bg-[var(--cs-primary)] text-white px-5 py-2 rounded-full text-sm font-semibold border-none cursor-pointer hover:bg-[var(--cs-dark)] disabled:opacity-50"
              >
                {t('login_form_submit')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </CsPage>
  );
};
