import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CsPage } from '../../components/CsPage';
import { CsMarkdown } from '../../components/CsMarkdown';
import { useSitePages } from '../../contexts/SitePagesContext';
import { contactApi } from '../../api/cs-api';

export const Contact: React.FC = () => {
  const { t, i18n } = useTranslation('dissco-cs');
  const { getContent, pages } = useSitePages();

  const dbContent = getContent('contact', i18n.language);
  const showForm = pages.find(p => p.page_key === 'contact')?.show_contact_form ?? true;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      await contactApi.send({ name, email, message, website });
      setStatus('sent');
      setName('');
      setEmail('');
      setMessage('');
      setWebsite('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container max-w-2xl">

          <header className="mb-4">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-4">{t('nav_contact')}</h1>
          </header>

        

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
                  disabled={status === 'sending'}
                  className="bg-[var(--cs-primary)] text-white px-5 py-2 rounded-full text-sm font-semibold border-none cursor-pointer hover:bg-[var(--cs-dark)] disabled:opacity-50"
                >
                  {t('contact_form_submit')}
                </button>
              </div>

              {status === 'sent' && <p className="text-green-700">{t('contact_form_success')}</p>}
              {status === 'error' && <p className="text-red-700">{t('contact_form_error')}</p>}
            </form>
          )}

        </div>
      </div>
    </CsPage>
  );
};
