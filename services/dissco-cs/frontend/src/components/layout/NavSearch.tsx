import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { LuSearch, LuX } from 'react-icons/lu';
import { withQuery } from '../../api/url';

// The navbar's search icon, which opens a small search box; submitting goes to /find.
export function NavSearch({ onSearched }: { onSearched: () => void }) {
  const { t } = useTranslation('dissco-cs');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setSearchOpen(false);
  }, [location]);

  const submitSearch = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    navigate(withQuery('/find', { q: trimmed }));
    setSearchOpen(false);
    setSearchQuery('');
    onSearched();
  };

  return (
    <div className="flex items-center gap-2">
      {searchOpen && (
        <form onSubmit={submitSearch} className="relative">
          <input
            ref={searchInputRef}
            type="text"
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onBlur={() => {
              if (!searchQuery.trim()) setSearchOpen(false);
            }}
            placeholder={t('search_placeholder')}
            className="text-[0.9rem] border border-[#ddd] rounded-full pl-3 pr-7 py-1 outline-none focus:border-cs-primary w-[180px] max-[768px]:w-full"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              aria-label={t('search_clear')}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-400 p-0 flex items-center hover:text-cs-primary"
            >
              <LuX style={{ fontSize: '0.75em' }} />
            </button>
          )}
        </form>
      )}
      <button
        type="button"
        onClick={() => setSearchOpen(o => !o)}
        aria-label={t('search_nav_label')}
        className="bg-transparent border-none cursor-pointer text-gray-600 p-0 flex items-center hover:text-cs-primary transition-colors duration-200"
      >
        <LuSearch style={{ fontSize: '1.1em' }} />
      </button>
    </div>
  );
}
