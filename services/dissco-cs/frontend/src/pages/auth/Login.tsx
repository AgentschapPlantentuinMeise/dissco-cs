import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { useSearchParams } from 'react-router-dom';
import { CsPage } from '../../components/layout/CsPage';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageBody } from '../../components/layout/PageBody';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { TermsModal } from '../../components/auth/TermsModal';
import { HrefLink } from '../../utility/href-link';
import { login, getTerms, acceptTerms } from '../../api/madoc-auth/auth';
import { MadocSiteTermsDto } from '@dissco-cs/shared-types';
import { clearJwt } from '../../api/jwt';
import { inputClass } from '../../components/ui/input-styles';
import { authErrorKey } from './auth-error';
import { FormField } from '../../components/ui/FormField';

export function Login() {
  const { t } = useTranslation('dissco-cs');
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingTerms, setPendingTerms] = useState<MadocSiteTermsDto | null>(null);

  const sessionExpired = searchParams.get('expired') === '1';

  const redirectAfterLogin = () => {
    const redirect = searchParams.get('redirect');
    window.location.href = redirect && redirect.startsWith('/') ? redirect : '/';
  };

  // Resolves to the terms the user still has to accept, or null when they can go on.
  const loginMutation = useMutation({
    mutationFn: async () => {
      const { user } = await login({ email, password });

      if (typeof user.hasTerms !== 'boolean') {
        // Fail closed: if we can't determine terms status, don't let the user through -
        // silently skipping the check would defeat the point of the gate.
        throw new Error('Unknown terms status');
      }

      return user.hasTerms && !user.hasAccepted ? (await getTerms()).latest : null;
    },
    onSuccess: terms => {
      if (terms) setPendingTerms(terms);
      else redirectAfterLogin();
    },
    meta: { handlesOwnError: true },
  });

  const termsMutation = useMutation({
    mutationFn: () => acceptTerms(),
    onSuccess: redirectAfterLogin,
    onError: () => setPendingTerms(null),
    meta: { handlesOwnError: true },
  });

  const submit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    termsMutation.reset();
    loginMutation.mutate();
  };

  const cancelTerms = () => {
    clearJwt();
    setPendingTerms(null);
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
          <FormField label={t('login_form_email')}>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={inputClass}
            />
          </FormField>

          <FormField label={t('login_form_password')}>
            <PasswordInput
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </FormField>

          {loginMutation.isError && <p className="text-red-700">{t(authErrorKey(loginMutation.error, 'login_form_error'))}</p>}
          {termsMutation.isError && <p className="text-red-700">{t(authErrorKey(termsMutation.error, 'login_terms_accept_error'))}</p>}

          <div className="flex items-center justify-between mt-2">
            <HrefLink href="/forgot-password" className="text-sm text-gray-600 hover:text-cs-primary">
              {t('login_forgot_password_link')}
            </HrefLink>
            <Button type="submit" disabled={!!pendingTerms} loading={loginMutation.isPending}>
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
          onAccept={() => termsMutation.mutate()}
          onCancel={cancelTerms}
          disabled={termsMutation.isPending}
        />
      )}
    </CsPage>
  );
}
