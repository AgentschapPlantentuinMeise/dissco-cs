import { useSearchParams } from 'react-router-dom';
import { useGridColumnCount } from './use-grid-column-count';
import { pageCount, pageSlice, parsePageParam } from '../utility/paging';

// Pages through a card grid by whole rows instead of a fixed number of cards, so every page shows
// a full grid whatever the number of columns that fit on the screen (see useGridColumnCount).
// The page lives in the URL (`?page=3`), so going back from a detail page, a refresh or a shared
// link opens the same page again.
export function usePagedGrid<Item>(items: Item[], rowsPerPage: number) {
  const [gridRef, columns] = useGridColumnCount<HTMLDivElement>();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageSize = columns * rowsPerPage;
  const totalPages = pageCount(items.length, pageSize);
  // Capped on render, never written back: while the list is still loading there is only one page,
  // and writing that to the URL would lose the page the user came back to.
  const currentPage = Math.min(parsePageParam(searchParams.get('page')), totalPages);

  const setCurrentPage = (page: number) => {
    setSearchParams(params => {
      if (page > 1) {
        params.set('page', String(page));
      } else {
        params.delete('page');
      }
      return params;
    });
  };

  return {
    gridRef,
    pageItems: pageSlice(items, currentPage, pageSize),
    currentPage,
    totalPages,
    setCurrentPage,
  };
}
