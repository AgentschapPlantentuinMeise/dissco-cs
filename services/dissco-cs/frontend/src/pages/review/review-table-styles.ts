// Status meanings follow Madoc's own REVIEW_STATUS_MAP (review-listing-page.tsx): 0 = not started,
// 1 = "todo" (assigned, not picked up yet), 2 = "in_review" (being handled).
export function reviewStatusKey(status: number): string {
  switch (status) {
    case 0: return 'review_status_not_started';
    case 1: return 'review_status_todo';
    case 2: return 'review_status_in_review';
    default: return 'review_status_unknown';
  }
}

// Badge colours: blue = being handled, yellow = waiting, grey = not started -- so it is clear at a
// glance who is working on what.
export const STATUS_BADGE_CLASSES: Record<number, string> = {
  0: 'bg-gray-100 text-gray-600',
  1: 'bg-[#fff3cd] text-[#856404]',
  2: 'bg-[#cfe2ff] text-[#0a4a8f]',
};
export const badgeClass = 'inline-block px-[10px] py-[3px] rounded-[12px] text-[0.75rem] font-semibold whitespace-nowrap';

export const thClass = 'px-4 py-3 font-bold cursor-pointer select-none whitespace-nowrap';
export const tdClass = 'px-4 py-3 border-t border-gray-100 text-sm text-gray-600';
