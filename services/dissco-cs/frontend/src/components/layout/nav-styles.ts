// Shared by the navbar's dropdowns (language switcher, user menu).
export const dropdownItemClass =
  'block w-full px-4 py-[10px] no-underline text-gray-600 text-[0.9rem] bg-transparent border-none cursor-pointer text-left box-border transition-colors duration-150 hover:bg-gray-100 hover:text-cs-primary';

// `placement` holds the dropdown's own offset and width, e.g. 'top-[calc(100%+8px)] min-w-[130px]'.
export const dropdownListClass = (isOpen: boolean, placement: string) =>
  `${isOpen ? 'block' : 'hidden'} absolute ${placement} right-0 bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.12)] z-[100] list-none p-[6px_0] m-0 max-[768px]:static max-[768px]:shadow-none max-[768px]:rounded-none max-[768px]:border-t max-[768px]:border-[#f0f0f0] max-[768px]:min-w-0`;
