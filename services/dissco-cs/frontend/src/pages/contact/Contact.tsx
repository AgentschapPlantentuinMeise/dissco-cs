import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { CsPage } from '../../components/layout/CsPage';
import { CsMarkdown } from '../../components/ui/CsMarkdown';
import { useNavItems } from '../../hooks/use-nav-items';
import { contactApi } from '../../api/cs-client/contact';

export function Contact() {
  const { t, i18n } = useTranslation('dissco-cs');
  const { getContent, navItems } = useNavItems();

  const dbContent = getContent('contact', i18n.language);
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
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide">

          <header className="mb-8">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-3">{t('nav_contact')}</h1>
          </header>

        

          <div className="max-w-2xl">
          <section className="mb-8">
            {dbContent ? <CsMarkdown content={dbContent} /> : <p className="text-base text-gray-600">{t('common_no_content')}</p>}
          </section>

          {showForm && (
            <form onSubmit={submit} className="flex flex-col gap-4">
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
                  className="border border-gray-300 rounded-lg p-2"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">{t('contact_form_email')}</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="border border-gray-300 rounded-lg p-2"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">{t('contact_form_message')}</span>
                <textarea
                  required
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="border border-gray-300 rounded-lg p-2 min-h-[160px]"
                />
              </label>

              <div>
                <button
                  type="submit"
                  disabled={sending}
                  className="bg-[var(--cs-primary)] text-white px-5 py-2 rounded-full text-sm font-semibold border-none cursor-pointer hover:bg-[var(--cs-dark)] disabled:opacity-50"
                >
                  {t('contact_form_submit')}
                </button>
              </div>

              {sent && <p className="text-green-700">{t('contact_form_success')}</p>}
            </form>
          )}
          </div>

        </div>
      </div>
    </CsPage>
  );
}
