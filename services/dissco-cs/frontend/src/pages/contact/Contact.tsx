import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { useMutation } from '@tanstack/react-query';
import { PageHeader } from '../../components/layout/PageHeader';
import { ManagedTextSection } from '../../components/layout/ManagedTextSection';
import { PageSection } from '../../components/layout/PageSection';
import { useNavItems } from '../../hooks/use-nav-items';
import { contactApi } from '../../api/cs-client/contact';
import { inputClass } from '../../components/ui/input-styles';
import {
  ContactSubmissionInput,
  contactSubmissionSchema,
  MAX_CONTACT_MESSAGE_LENGTH,
  MAX_CONTACT_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
} from '@dissco-cs/shared-types';
import { useValidatedForm } from '../../hooks/use-validated-form';
import { SavedNotice } from '../../components/ui/SavedNotice';
import { FormField } from '../../components/ui/FormField';

export function Contact() {
  const { t, i18n } = useTranslation('dissco-cs');
  const { navItems, getIntro, getContent } = useNavItems();

  const showForm = navItems.find(p => p.pageKey === 'contact')?.showContactForm ?? true;

  const form = useValidatedForm(contactSubmissionSchema, { name: '', email: '', message: '', website: '' });
  const { mutate: send, isPending: sending, isSuccess: sent } = useMutation({
    mutationFn: (values: ContactSubmissionInput) => contactApi.send(values),
    onSuccess: () => form.reset(),
    meta: { errorMessage: 'error_send_failed' },
  });

  const submit = form.handleSubmit(values => send(values));

  return (
    <>
      <PageHeader variant="compact" title={t('nav_contact')} lead={getIntro('contact', i18n.language) || t('contact_intro_default')} />
      {getContent('contact', i18n.language)?.trim() && <ManagedTextSection pageKey="contact" />}

      {showForm && (
        <PageSection>
          <form noValidate onSubmit={submit} className="flex flex-col gap-4 max-w-2xl">
            {/* Honeypot: hidden from real visitors, often auto-filled by spam bots. */}
            <label
              htmlFor="contact-website"
              className="absolute -left-[9999px] w-px h-px overflow-hidden"
              aria-hidden="true"
            >
              Website
              <input {...form.register('website')} id="contact-website" type="text" tabIndex={-1} autoComplete="off" />
            </label>

            <FormField label={t('contact_form_name')} error={form.errorFor('name')}>
              <input {...form.field('name')} type="text" autoComplete="name" maxLength={MAX_CONTACT_NAME_LENGTH} className={inputClass} />
            </FormField>

            <FormField label={t('contact_form_email')} error={form.errorFor('email')}>
              <input {...form.field('email')} type="email" autoComplete="email" maxLength={MAX_EMAIL_LENGTH} className={inputClass} />
            </FormField>

            <FormField label={t('contact_form_message')} error={form.errorFor('message')}>
              <textarea {...form.field('message')} maxLength={MAX_CONTACT_MESSAGE_LENGTH} className={`${inputClass} min-h-[160px]`} />
            </FormField>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={sending}>
                {t('contact_form_submit')}
              </Button>
              {sent && !form.formState.isDirty && <SavedNotice>{t('contact_form_success')}</SavedNotice>}
            </div>
          </form>
        </PageSection>
      )}
    </>
  );
}
