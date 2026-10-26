import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { LuSearch, LuX } from 'react-icons/lu';
import { withQuery } from '../../api/url';
import { IconButton } from '../ui/IconButton';

// The navbar's search; submitting goes to /find. 'bar': a search icon that opens a small field, so
// the bar stays quiet; Escape or leaving it empty closes it again. 'panel': a full-width field, in
// the mobile menu.
export function NavSearch({ variant = 'bar' }: { variant?: 'bar' | 'panel' }) {
  const { t } = useTranslation('dissco-cs');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isBar = variant === 'bar';

  useEffect(() => {
    setOpen(false);
  }, [location]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const submit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(withQuery('/find', { q: trimmed }));
    setQuery('');
  };

  // The icon is hidden while the field is open: clicking it would first blur (and close) the field.
  if (isBar && !open) {
    return <IconButton icon={LuSearch} label={t('search_nav_label')} onClick={() => setOpen(true)} />;
  }

  return (
    <form onSubmit={submit} role="search" className={`relative flex items-center ${isBar ? '' : 'w-full'}`}>
      <LuSearch aria-hidden="true" className="absolute left-2.5 text-gray-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onBlur={() => {
          if (isBar && !query.trim()) setOpen(false);
        }}
        onKeyDown={e => {
          if (isBar && e.key === 'Escape') setOpen(false);
        }}
        aria-label={t('search_nav_label')}
        placeholder={t('search_placeholder')}
        className={`text-[0.86rem] border border-gray-300 rounded bg-gray-50 pl-8 pr-8 py-1.5 outline-none focus:border-cs-accent focus:bg-white [&::-webkit-search-cancel-button]:hidden ${
          isBar ? 'w-[170px]' : 'w-full'
        }`}
      />
      {query && (
        <IconButton
          icon={LuX}
          label={t('search_clear')}
          onClick={() => {
            setQuery('');
            inputRef.current?.focus();
          }}
          className="absolute right-1 text-sm"
        />
      )}
    </form>
  );
}
