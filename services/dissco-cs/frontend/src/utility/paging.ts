/**
 * The number of pages for a list, at least one (an empty list still shows page 1).
 * @param total the number of items
 * @param pageSize items per page, more than 0
 * Returns: the number of pages.
 */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * The items on one page.
 * @param items the whole list, in display order
 * @param page the page, counted from 1
 * @param pageSize items per page
 * Returns: that page's items (empty past the last page).
 */
export function pageSlice<Item>(items: Item[], page: number, pageSize: number): Item[] {
  return items.slice((page - 1) * pageSize, page * pageSize);
}

/**
 * The page asked for in the URL (`?page=3`), so an overview opens again on the page the user left.
 * @param value the raw `page` query parameter, or null when there is none
 * Returns: the page, counted from 1; 1 for a missing or invalid value.
 */
export function parsePageParam(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/**
 * The page an item is on, e.g. to open a deep-linked forum topic on the right page.
 * @param items the whole list, in display order
 * @param isItem picks the item
 * @param pageSize items per page
 * Returns: the page, counted from 1, or null when the item is not in the list.
 */
export function pageOfItem<Item>(items: Item[], isItem: (item: Item) => boolean, pageSize: number): number | null {
  const index = items.findIndex(isItem);
  return index < 0 ? null : Math.floor(index / pageSize) + 1;
}
