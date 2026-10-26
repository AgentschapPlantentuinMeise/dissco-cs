import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { useSearchParams } from 'react-router-dom';
import { CsPage } from '../../components/layout/CsPage';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageBody } from '../../components/layout/PageBody';
import { TermsModal } from '../../components/auth/TermsModal';
import { HrefLink } from '../../utility/href-link';
import { login, getTerms, acceptTerms } from '../../api/madoc-auth/auth';
import { MadocSiteTermsDto } from '@dissco-cs/shared-types';
import { clearJwt } from '../../api/jwt';
import { inputClass } from '../../components/ui/input-styles';

export function Login() {
  const { t } = useTranslation('dissco-cs');
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [error, setError] = useState('');
  const [pendingTerms, setPendingTerms] = useState<MadocSiteTermsDto | null>(null);

  const sessionExpired = searchParams.get('expired') === '1';

  const redirectAfterLogin = () => {
    const redirect = searchParams.get('redirect');
    window.location.href = redirect && redirect.startsWith('/') ? redirect : '/';
  };

  const submit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const loginResult = await login({ email, password });

      if (typeof loginResult.user.hasTerms !== 'boolean') {
        // Fail closed: if we can't determine terms status, don't let the user through -
        // silently skipping the check would defeat the point of the gate.
        throw new Error(t('login_form_error'));
      }

      if (loginResult.user.hasTerms && !loginResult.user.hasAccepted) {
        const { latest } = await getTerms();
        if (latest) {
          setPendingTerms(latest);
          setStatus('idle');
          return;
        }
      }

      redirectAfterLogin();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : t('login_form_error'));
    }
  };

  const acceptTermsAndContinue = async () => {
    setStatus('sending');
    try {
      await acceptTerms();
      redirectAfterLogin();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : t('login_terms_accept_error'));
      setPendingTerms(null);
    }
  };

  const cancelTerms = () => {
    clearJwt();
    setPendingTerms(null);
    setStatus('idle');
  };

  return (
    <CsPage>
      <PageBody width="narrow">
        <PageHeader
          variant="plain"
          title={t('login_title')}
          lead={
            <>
              {t('login_no_account')}{' '}
              <HrefLink href="/register" className="text-cs-primary">
                {t('login_register_link')}
              </HrefLink>
            </>
          }
        />

        {sessionExpired && (
          <p className="mb-4 text-sm text-gray-600 bg-gray-100 rounded-lg p-3">{t('login_session_expired')}</p>
        )}

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">{t('login_form_email')}</span>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">{t('login_form_password')}</span>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>

          {status === 'error' && <p className="text-red-700">{error}</p>}

          <div className="flex items-center justify-between mt-2">
            <HrefLink href="/forgot-password" className="text-sm text-gray-600 hover:text-cs-primary">
              {t('login_forgot_password_link')}
            </HrefLink>
            <Button
              type="submit"
              disabled={status === 'sending' || !!pendingTerms}
            >
              {t('login_form_submit')}
            </Button>
          </div>
        </form>
      </PageBody>

      {pendingTerms && (
        <TermsModal
          title={t('login_terms_modal_title')}
          intro={
            <>
              {t('login_terms_modal_intro')}{' '}
              <HrefLink href="/contact" className="text-cs-primary" onClick={cancelTerms}>
                {t('login_terms_modal_contact_link')}
              </HrefLink>
            </>
          }
          terms={pendingTerms}
          acceptLabel={t('login_terms_accept_button')}
          cancelLabel={t('common_cancel')}
          onAccept={acceptTermsAndContinue}
          onCancel={cancelTerms}
          disabled={status === 'sending'}
        />
      )}
    </CsPage>
  );
}
