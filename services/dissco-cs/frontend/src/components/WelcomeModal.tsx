import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { CsMarkdown } from './CsMarkdown';
import { Modal } from './Modal';
import { useSitePages } from '../contexts/SitePagesContext';
import { useUser } from '../hooks/use-current-user';

// Shown once, right after a new account is activated — see the redirect to
// `/?welcome=1` in SetPassword.tsx. Not stored anywhere (no cookie/DB flag): closing
// the modal simply drops the query param, so a page reload won't bring it back.
export const WelcomeModal: React.FC = () => {
  const { t, i18n } = useTranslation('dissco-cs');
  const [searchParams, setSearchParams] = useSearchParams();
  const { loading, isActive, getContent } = useSitePages();
  const user = useUser();

  const show = searchParams.get('welcome') === '1';
  const rawContent = getContent('welcome', i18n.language) || getContent('welcome', 'nl');
  const content = rawContent?.replace(/\{\{\s*name\s*\}\}/g, user?.name ?? '');
  const visible = !loading && show && isActive('welcome') && !!content?.trim();

  if (!visible || !content) {
    return null;
  }

  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('welcome');
    setSearchParams(next, { replace: true });
  };

  return (
    <Modal open onClose={close}>
      <div
        className="[&_p:first-child]:text-2xl [&_p:first-child]:font-semibold [&_p:first-child]:text-[var(--cs-primary)] [&_p:first-child]:leading-snug [&_p:first-child]:mb-3
          [&_p]:text-base [&_p]:text-gray-700 [&_p]:leading-relaxed [&_p]:mb-4 [&_p:last-child]:mb-0
          [&_a]:mt-1 [&_a]:inline-block [&_a]:rounded-full [&_a]:bg-[var(--cs-primary)] [&_a]:px-5 [&_a]:py-2 [&_a]:text-sm [&_a]:font-semibold [&_a]:text-white [&_a]:no-underline [&_a]:transition-colors [&_a]:hover:bg-[var(--cs-dark)]"
      >
        <CsMarkdown content={content} />
        <Link
          to="/explore"
          className="mt-1 inline-block rounded-full bg-[var(--cs-primary)] px-5 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-[var(--cs-dark)]"
        >
          {t('welcome_popup_cta')}
        </Link>
      </div>
    </Modal>
  );
};
