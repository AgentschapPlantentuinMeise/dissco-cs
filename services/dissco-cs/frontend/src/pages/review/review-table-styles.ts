// Statusbetekenis volgt Madoc's eigen REVIEW_STATUS_MAP (review-listing-page.tsx):
// 1 = "todo" (toegewezen, nog niet actief opgepakt), 2 = "in_review" (actief in behandeling).
export function reviewStatusKey(status: number): string {
  switch (status) {
    case 0: return 'review_status_not_started';
    case 1: return 'review_status_todo';
    case 2: return 'review_status_in_review';
    default: return 'review_status_unknown';
  }
}

// Zelfde badge-kleuren als UserDashboard.tsx (BADGE_CLASSES) voor consistentie: blauw = actief
// bezig, geel = wachtend, grijs = nog niet toegewezen -- zo is bij meerdere reviewers per
// project in één oogopslag te zien wie waarmee bezig is.
export const STATUS_BADGE_CLASSES: Record<number, string> = {
  0: 'bg-gray-100 text-gray-600',
  1: 'bg-[#fff3cd] text-[#856404]',
  2: 'bg-[#cfe2ff] text-[#0a4a8f]',
};
export const badgeClass = 'inline-block px-[10px] py-[3px] rounded-[12px] text-[0.75rem] font-semibold whitespace-nowrap';

export const thClass = 'px-4 py-3 font-bold cursor-pointer select-none whitespace-nowrap';
export const tdClass = 'px-4 py-3 border-t border-gray-100 text-sm text-gray-600';
