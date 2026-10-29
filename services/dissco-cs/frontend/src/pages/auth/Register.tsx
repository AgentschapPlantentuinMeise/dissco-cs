import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { useSearchParams } from 'react-router-dom';
import { CsPage } from '../../components/layout/CsPage';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageBody } from '../../components/layout/PageBody';
import { TermsModal } from '../../components/auth/TermsModal';
import { HrefLink } from '../../utility/href-link';
import { MAX_EMAIL_LENGTH, MAX_USER_NAME_LENGTH } from '@dissco-cs/shared-types';
import { register } from '../../api/madoc-auth/auth';
import { authQueries } from '../../api/queries/auth';
import { failedToLoad } from '../../api/query-state';
import { PageLoadError } from '../../components/layout/PageLoadError';
import { useCurrentUser } from '../../hooks/use-current-user';
import { getSiteSlug } from '../../api/slug';
import { inputClass } from '../../components/ui/input-styles';
import { reportAuthError } from './auth-error';

export function Register() {
  const { t } = useTranslation('dissco-cs');
  const [searchParams] = useSearchParams();
  const user = useCurrentUser();
  const code = searchParams.get('code') || undefined;
  const formRef = useRef<HTMLFormElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'error' | 'success'>('idle');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);

  const invitationQuery = useQuery(authQueries.invitation(code));
  const termsQuery = useQuery(authQueries.terms());
  const invitation = invitationQuery.data;
  const terms = termsQuery.data?.latest;

  // A fault, not an expired invitation. Without the terms the form would let the user submit
  // without accepting them, and Madoc would refuse the registration.
  if (failedToLoad(invitationQuery) || failedToLoad(termsQuery)) {
    return <PageLoadError />;
  }

  if (termsQuery.isPending || (code && !invitation)) {
    return (
      <CsPage>{null}</CsPage>
    );
  }

  if (code && invitation && 'expired' in invitation) {
    return (
      <CsPage>
        <PageBody width="narrow">
          <PageHeader variant="plain" title={t('register_title')} />
          <p className="text-red-700">{t('register_invitation_expired')}</p>
        </PageBody>
      </CsPage>
    );
  }

  if (code && invitation && user) {
    return (
      <CsPage>
        <PageBody width="narrow">
          <PageHeader variant="plain" title={t('register_title')} />
          <p className="text-base text-gray-600">{t('register_already_logged_in', { name: user.name })}</p>
        </PageBody>
      </CsPage>
    );
  }

  const doRegister = async (accepted: boolean) => {
    const capToken = (formRef.current?.elements.namedItem('cap-token') as HTMLInputElement | null)?.value || '';

    setStatus('sending');
    try {
      const result = await register({ name, email, capToken, code, termsAccepted: accepted });
      setEmailSent(result.emailSent);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(t(reportAuthError(err, 'register_form_error')));
    }
  };

  const submit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (terms && !termsAccepted) {
      setShowTermsPopup(true);
      return;
    }

    await doRegister(termsAccepted);
  };

  if (status === 'success') {
    return (
      <CsPage>
        <PageBody width="narrow">
          <PageHeader variant="plain" title={t('register_title')} />
          {emailSent ? (
            <p>{t('register_success_email_sent')}</p>
          ) : (
            <p>{t('register_success_no_email')}</p>
          )}
        </PageBody>
      </CsPage>
    );
  }

  return (
    <CsPage>
      <PageBody width="narrow">
        <PageHeader
          variant="plain"
          title={t('register_title')}
          lead={
            invitation && !('expired' in invitation) ? (
              t('register_invitation_intro')
            ) : (
              <>
                {t('register_have_account')}{' '}
                <HrefLink href="/login" className="text-cs-primary">
                  {t('register_login_link')}
                </HrefLink>
              </>
            )
          }
        />

        <form ref={formRef} onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">{t('register_form_name')}</span>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={MAX_USER_NAME_LENGTH}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">{t('register_form_email')}</span>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              maxLength={MAX_EMAIL_LENGTH}
              className={inputClass}
            />
          </label>

          {/* @ts-expect-error custom element from @cap.js/widget, loaded in index.html */}
          <cap-widget data-cap-api-endpoint={`/s/${getSiteSlug()}/madoc/api/captcha/`} />

          {terms && (
            <div className="text-sm">
              {termsAccepted ? (
                <span className="text-cs-primary">{t('register_terms_accepted')}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTermsPopup(true)}
                  className="text-cs-primary underline bg-transparent border-none cursor-pointer p-0"
                >
                  {t('register_terms_button')}
                </button>
              )}
            </div>
          )}

          {status === 'error' && <p className="text-red-700">{error}</p>}

          <div>
            <Button
              type="submit"
              disabled={status === 'sending'}
            >
              {t('register_form_submit')}
            </Button>
          </div>
        </form>
      </PageBody>

      {showTermsPopup && terms && (
        <TermsModal
          title={t('register_terms_modal_title')}
          terms={terms}
          acceptLabel={t('register_terms_accept_button')}
          cancelLabel={t('common_close')}
          onAccept={() => {
            setTermsAccepted(true);
            setShowTermsPopup(false);
            doRegister(true);
          }}
          onCancel={() => setShowTermsPopup(false)}
        />
      )}
    </CsPage>
  );
}
