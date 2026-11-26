import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { useSearchParams } from 'react-router-dom';
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
import { authErrorKey } from './auth-error';
import { FormField } from '../../components/ui/FormField';
import { FormError } from '../../components/ui/FormError';
import { useValidatedForm } from '../../hooks/use-validated-form';
import { z } from 'zod';
import { emailSchema } from '@dissco-cs/shared-types';

const registerSchema = z.object({ name: z.string().trim().min(1).max(MAX_USER_NAME_LENGTH), email: emailSchema });

export function Register() {
  const { t } = useTranslation('dissco-cs');
  const [searchParams] = useSearchParams();
  const user = useCurrentUser();
  const code = searchParams.get('code') || undefined;
  const formRef = useRef<HTMLFormElement>(null);

  const form = useValidatedForm(registerSchema, { name: '', email: '' });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);

  const invitationQuery = useQuery(authQueries.invitation(code));
  const termsQuery = useQuery(authQueries.terms());
  const invitation = invitationQuery.data;
  const terms = termsQuery.data?.latest;

  const registration = useMutation({
    // Reads the values itself: accepting the terms in their popup also sends the form.
    mutationFn: (accepted: boolean) => {
      const capToken = (formRef.current?.elements.namedItem('cap-token') as HTMLInputElement | null)?.value || '';
      const { name, email } = registerSchema.parse(form.getValues());
      return register({ name, email, capToken, code, termsAccepted: accepted });
    },
    meta: { handlesOwnError: true },
  });

  // A fault, not an expired invitation. Without the terms the form would let the user submit
  // without accepting them, and Madoc would refuse the registration.
  if (failedToLoad(invitationQuery) || failedToLoad(termsQuery)) {
    return <PageLoadError />;
  }

  if (termsQuery.isPending || (code && !invitation)) {
    return null;
  }

  if (code && invitation && 'expired' in invitation) {
    return (
      <PageBody width="narrow">
        <PageHeader variant="plain" title={t('register_title')} />
        <FormError>{t('register_invitation_expired')}</FormError>
      </PageBody>
    );
  }

  if (code && invitation && user) {
    return (
      <PageBody width="narrow">
        <PageHeader variant="plain" title={t('register_title')} />
        <p className="text-base text-gray-600">{t('register_already_logged_in', { name: user.name })}</p>
      </PageBody>
    );
  }

  const submit = form.handleSubmit(() => {
    if (terms && !termsAccepted) {
      setShowTermsPopup(true);
      return;
    }

    registration.mutate(termsAccepted);
  });

  if (registration.isSuccess) {
    return (
      <PageBody width="narrow">
        <PageHeader variant="plain" title={t('register_title')} />
        {registration.data.emailSent ? (
          <p>{t('register_success_email_sent')}</p>
        ) : (
          <p>{t('register_success_no_email')}</p>
        )}
      </PageBody>
    );
  }

  return (
    <>
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

        <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-4">
          <FormField label={t('register_form_name')} error={form.errorFor('name')}>
            <input {...form.field('name')} type="text" autoComplete="name" maxLength={MAX_USER_NAME_LENGTH} className={inputClass} />
          </FormField>

          <FormField label={t('register_form_email')} error={form.errorFor('email')}>
            <input {...form.field('email')} type="email" autoComplete="email" maxLength={MAX_EMAIL_LENGTH} className={inputClass} />
          </FormField>

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

          {registration.isError && <FormError>{t(authErrorKey(registration.error, 'register_form_error'))}</FormError>}

          <div>
            <Button type="submit" loading={registration.isPending}>
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
            registration.mutate(true);
          }}
          onCancel={() => setShowTermsPopup(false)}
        />
      )}
    </>
  );
}
