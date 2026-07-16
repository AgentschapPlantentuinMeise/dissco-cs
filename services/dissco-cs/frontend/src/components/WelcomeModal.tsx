import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CsMarkdown } from './CsMarkdown';
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
  const [entered, setEntered] = useState(false);

  const show = searchParams.get('welcome') === '1';
  const rawContent = getContent('welcome', i18n.language) || getContent('welcome', 'nl');
  const content = rawContent?.replace(/\{\{\s*name\s*\}\}/g, user?.name ?? '');
  const visible = !loading && show && isActive('welcome') && !!content?.trim();

  // Enter transition: mount at scale-95/opacity-0, then flip a frame later so the
  // CSS transition actually animates instead of jumping straight to its end state.
  useEffect(() => {
    if (!visible) {
      setEntered(false);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [visible]);

  if (!visible || !content) {
    return null;
  }

  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('welcome');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={close}>
      <div
        className={`relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-[0_25px_60px_rgba(0,0,0,0.3)] transition-all duration-300 motion-reduce:transition-none ${
          entered ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-24 shrink-0 overflow-hidden bg-[var(--cs-primary)]">
          {/* Purely color-based, driven by the site's own --cs-* theme vars — no
              assumption about what (if anything) a given institute's imagery looks like. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              background:
                'radial-gradient(140px 140px at 10% 130%, var(--cs-secondary), transparent 70%), ' +
                'radial-gradient(120px 120px at 90% -30%, var(--cs-accent), transparent 70%)',
            }}
          />
          <button
            type="button"
            onClick={close}
            aria-label={t('announcement_dismiss')}
            className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full border-none bg-white/90 text-gray-700 shadow cursor-pointer hover:bg-white"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div
          className="relative -mt-6 max-h-[65vh] overflow-y-auto bg-white px-7 pb-7 pt-7
            [&_p:first-child]:text-2xl [&_p:first-child]:font-semibold [&_p:first-child]:text-[var(--cs-primary)] [&_p:first-child]:leading-snug [&_p:first-child]:mb-3
            [&_p]:text-base [&_p]:text-gray-700 [&_p]:leading-relaxed [&_p]:mb-4 [&_p:last-child]:mb-0
            [&_a]:mt-1 [&_a]:inline-block [&_a]:rounded-full [&_a]:bg-[var(--cs-primary)] [&_a]:px-5 [&_a]:py-2 [&_a]:text-sm [&_a]:font-semibold [&_a]:text-white [&_a]:no-underline [&_a]:transition-colors [&_a]:hover:bg-[var(--cs-dark)]"
          style={{ borderRadius: '50% 50% 0 0 / 24px 24px 0 0' }}
        >
          <CsMarkdown content={content} />
        </div>
      </div>
    </div>
  );
};
