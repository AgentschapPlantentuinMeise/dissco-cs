import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { useMutation } from '@tanstack/react-query';
import { CsPage } from '../../components/layout/CsPage';
import { PageHeader } from '../../components/layout/PageHeader';
import { ManagedTextSection } from '../../components/layout/ManagedTextSection';
import { PageSection } from '../../components/layout/PageSection';
import { useNavItems } from '../../hooks/use-nav-items';
import { contactApi } from '../../api/cs-client/contact';
import { inputClass } from '../../components/ui/input-styles';
import { SavedNotice } from '../../components/ui/SavedNotice';

export function Contact() {
  const { t, i18n } = useTranslation('dissco-cs');
  const { navItems, getIntro } = useNavItems();

  const showForm = navItems.find(p => p.pageKey === 'contact')?.showContactForm ?? true;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const { mutate: send, isPending: sending, isSuccess: sent } = useMutation({
    mutationFn: () => contactApi.send({ name, email, message, website }),
    onSuccess: () => {
      setName('');
      setEmail('');
      setMessage('');
      setWebsite('');
    },
    meta: { errorMessage: 'error_send_failed' },
  });

  const submit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    send();
  };

  return (
    <CsPage>
      <PageHeader variant="compact" title={t('nav_contact')} lead={getIntro('contact', i18n.language) || t('contact_intro_default')} />
      <ManagedTextSection pageKey="contact" />

      {showForm && (
        <PageSection>
          <form onSubmit={submit} className="flex flex-col gap-4 max-w-2xl">
            {/* Honeypot: hidden from real visitors, often auto-filled by spam bots. */}
            <label
              htmlFor="contact-website"
              className="absolute -left-[9999px] w-px h-px overflow-hidden"
              aria-hidden="true"
            >
              Website
              <input
                id="contact-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={e => setWebsite(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">{t('contact_form_name')}</span>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">{t('contact_form_email')}</span>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">{t('contact_form_message')}</span>
              <textarea
                required
                value={message}
                onChange={e => setMessage(e.target.value)}
                className={`${inputClass} min-h-[160px]`}
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={sending}>
                {t('contact_form_submit')}
              </Button>
              {sent && <SavedNotice>{t('contact_form_success')}</SavedNotice>}
            </div>
          </form>
        </PageSection>
      )}
    </CsPage>
  );
}
