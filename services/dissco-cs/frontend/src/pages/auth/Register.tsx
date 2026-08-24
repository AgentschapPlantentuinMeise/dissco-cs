import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CsPage } from '../../components/CsPage';
import { TermsModal } from '../../components/TermsModal';
import { HrefLink } from '../../utility/href-link';
import { register, getInvitation, getTerms, InvitationResponse, SiteTerms } from '../../api/madoc-client/auth';
import { useUser } from '../../hooks/use-current-user';
import { getSiteSlug } from '../../api/slug';

export const Register: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  const [searchParams] = useSearchParams();
  const user = useUser();
  const code = searchParams.get('code') || undefined;
  const formRef = useRef<HTMLFormElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading-invitation' | 'sending' | 'error' | 'success'>(
    code ? 'loading-invitation' : 'idle'
  );
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState<InvitationResponse | null>(null);
  const [emailSent, setEmailSent] = useState(true);
  const [terms, setTerms] = useState<SiteTerms | null | undefined>(undefined);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);

  useEffect(() => {
    if (!code) {
      return;
    }
    getInvitation(code)
      .then(setInvitation)
      .catch(() => setInvitation({ expired: true }));
  }, [code]);

  useEffect(() => {
    getTerms()
      .then(res => setTerms(res.latest))
      .catch(() => setTerms(null));
  }, []);

  if (code && status === 'loading-invitation' && !invitation) {
    return (
      <CsPage>
        <div className="cs-main-wrapper pt-10 pb-16">
          <div className="cs-container max-w-md" />
        </div>
      </CsPage>
    );
  }

  if (code && invitation && 'expired' in invitation) {
    return (
      <CsPage>
        <div className="cs-main-wrapper pt-10 pb-16">
          <div className="cs-container max-w-md">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-4">{t('register_title')}</h1>
            <p className="text-red-700">{t('register_invitation_expired')}</p>
          </div>
        </div>
      </CsPage>
    );
  }

  if (code && invitation && user) {
    return (
      <CsPage>
        <div className="cs-main-wrapper pt-10 pb-16">
          <div className="cs-container max-w-md">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-4">{t('register_title')}</h1>
            <p className="text-base text-gray-600">{t('register_already_logged_in', { name: user.name })}</p>
          </div>
        </div>
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
      setError(err instanceof Error ? err.message : t('register_form_error'));
    }
  };

  const submit = async (e: React.FormEvent) => {
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
        <div className="cs-main-wrapper pt-10 pb-16">
          <div className="cs-container max-w-md">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-4">{t('register_title')}</h1>
            {emailSent ? (
              <p>{t('register_success_email_sent')}</p>
            ) : (
              <p>{t('register_success_no_email')}</p>
            )}
          </div>
        </div>
      </CsPage>
    );
  }

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container max-w-md">
          <header className="mb-8">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-3">{t('register_title')}</h1>
            {invitation && !('expired' in invitation) ? (
              <p className="text-lg text-gray-600">{t('register_invitation_intro')}</p>
            ) : (
              <p className="text-lg text-gray-600">
                {t('register_have_account')}{' '}
                <HrefLink href="/login" className="text-[var(--cs-primary)]">
                  {t('register_login_link')}
                </HrefLink>
              </p>
            )}
          </header>

          <form ref={formRef} onSubmit={submit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">{t('register_form_name')}</span>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="border border-gray-300 rounded-lg p-2"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">{t('register_form_email')}</span>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="border border-gray-300 rounded-lg p-2"
              />
            </label>

            {/* @ts-expect-error custom element from @cap.js/widget, loaded in index.html */}
            <cap-widget data-cap-api-endpoint={`/s/${getSiteSlug()}/madoc/api/captcha/`} />

            {terms && (
              <div className="text-sm">
                {termsAccepted ? (
                  <span className="text-[var(--cs-primary)]">{t('register_terms_accepted')}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowTermsPopup(true)}
                    className="text-[var(--cs-primary)] underline bg-transparent border-none cursor-pointer p-0"
                  >
                    {t('register_terms_button')}
                  </button>
                )}
              </div>
            )}

            {status === 'error' && <p className="text-red-700">{error}</p>}

            <div>
              <button
                type="submit"
                disabled={status === 'sending'}
                className="bg-[var(--cs-primary)] text-white px-5 py-2 rounded-full text-sm font-semibold border-none cursor-pointer hover:bg-[var(--cs-dark)] disabled:opacity-50"
              >
                {t('register_form_submit')}
              </button>
            </div>
          </form>
        </div>
      </div>

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
};
