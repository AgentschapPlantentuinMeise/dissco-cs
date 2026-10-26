// Shared by the navbar's menus (language, account). Headless UI marks the item under the mouse or
// keyboard with data-focus. The menus open in a portal, so they need a z-index above the navbar (200).
export const menuItemsClass =
  'z-[250] min-w-[200px] bg-white rounded border border-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.16)] py-1.5 focus:outline-none';

export const menuItemClass =
  'flex w-full items-center justify-between gap-3 px-4 py-2 text-[0.9rem] text-gray-800 no-underline bg-transparent border-0 text-left cursor-pointer data-[focus]:bg-gray-100 data-[focus]:text-cs-primary';

export const menuSeparatorClass = 'my-1 border-t border-gray-200';

// A small dot that says something new is waiting; the number is shown where it is used.
export const newDotClass = 'w-2 h-2 rounded-full bg-cs-secondary';
