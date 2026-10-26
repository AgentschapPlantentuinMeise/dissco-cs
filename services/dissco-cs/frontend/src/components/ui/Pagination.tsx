import { useTranslation } from 'react-i18next';

// Page buttons below a card grid: previous, every page number, next. Hidden with a single page.
export function Pagination({ currentPage, totalPages, onChange, label }: {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
  // What is paged, for screen readers, e.g. "Pages of projects".
  label: string;
}) {
  const { t } = useTranslation('dissco-cs');
  if (totalPages <= 1) {
    return null;
  }

  const stepClass =
    'py-2 px-4 text-sm font-medium text-cs-primary bg-transparent border border-cs-primary rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cs-primary hover:text-white';

  return (
    <nav className="mt-8 flex justify-center items-center gap-2 flex-wrap" aria-label={label}>
      <button type="button" onClick={() => onChange(currentPage - 1)} disabled={currentPage === 1} className={stepClass}>
        {t('pagination_prev')}
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
        <button
          type="button"
          key={page}
          onClick={() => onChange(page)}
          aria-current={page === currentPage ? 'page' : undefined}
          aria-label={t('pagination_page', { page })}
          className={
            page === currentPage
              ? 'w-9 h-9 text-sm font-semibold text-white bg-cs-primary border border-cs-primary rounded cursor-pointer'
              : 'w-9 h-9 text-sm font-medium text-cs-primary bg-transparent border border-transparent rounded cursor-pointer hover:border-cs-primary'
          }
        >
          {page}
        </button>
      ))}
      <button type="button" onClick={() => onChange(currentPage + 1)} disabled={currentPage === totalPages} className={stepClass}>
        {t('pagination_next')}
      </button>
    </nav>
  );
}
