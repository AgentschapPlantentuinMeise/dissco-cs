import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CsPage } from '../../components/CsPage';
import { madocClient } from '../../api/madoc-client';

// Mirrors validatePasswordStrength() in services/madoc-ts/src/routes/dissco-cs-auth.ts -
// this is client-side feedback only, the server call is the real source of truth.
function checkPasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return 'set_password_error_length';
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'set_password_error_complexity';
  }
  return null;
}

export const SetPassword: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  const [searchParams] = useSearchParams();
  const c1 = searchParams.get('c1') || '';
  const c2 = searchParams.get('c2') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [error, setError] = useState('');

  const strengthKey = password ? checkPasswordStrength(password) : null;
  const canSubmit = !strengthKey && password === confirmPassword && password.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }

    setStatus('sending');
    try {
      await madocClient.setPassword({ c1, c2, password });
      window.location.href = '/';
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : t('set_password_form_error'));
    }
  };

  if (!c1 || !c2) {
    return (
      <CsPage>
        <div className="cs-main-wrapper pt-10 pb-16">
          <div className="cs-container max-w-md">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-4">{t('set_password_title')}</h1>
            <p className="text-red-700">{t('set_password_invalid_link')}</p>
          </div>
        </div>
      </CsPage>
    );
  }

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container max-w-md">
          <header className="mb-6">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-4">{t('set_password_title')}</h1>
            <p className="text-base text-gray-600">{t('set_password_intro')}</p>
          </header>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">{t('set_password_form_password')}</span>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="border border-gray-300 rounded-lg p-2"
              />
              {strengthKey && <span className="text-sm text-red-700">{t(strengthKey)}</span>}
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">{t('set_password_form_confirm')}</span>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="border border-gray-300 rounded-lg p-2"
              />
              {confirmPassword && confirmPassword !== password && (
                <span className="text-sm text-red-700">{t('set_password_error_mismatch')}</span>
              )}
            </label>

            {status === 'error' && <p className="text-red-700">{error}</p>}

            <div>
              <button
                type="submit"
                disabled={!canSubmit || status === 'sending'}
                className="bg-[var(--cs-primary)] text-white px-5 py-2 rounded-full text-sm font-semibold border-none cursor-pointer hover:bg-[var(--cs-dark)] disabled:opacity-50"
              >
                {t('set_password_form_submit')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </CsPage>
  );
};
