// Every date on the site goes through here, so all of them follow the site's language the same way.
// A moment is an ISO string (our own DTOs), milliseconds (Madoc's modified_at) or a Date.
type Moment = string | number | Date;

// Date and time, without seconds: "18-11-2026 14:03".
export function formatDate(moment: Moment, language: string): string {
  return new Date(moment).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' });
}

// Only the date: "18-11-2026".
export function formatDay(moment: Moment, language: string): string {
  return new Date(moment).toLocaleDateString(language, { dateStyle: 'short' });
}

// Day and month without the year: "18 nov." or "18 november".
export function formatDayMonth(moment: Moment, language: string, month: 'short' | 'long'): string {
  return new Date(moment).toLocaleDateString(language, { day: 'numeric', month });
}

// Only the month's name: "nov." or "november".
export function formatMonth(moment: Moment, language: string, month: 'short' | 'long'): string {
  return new Date(moment).toLocaleDateString(language, { month });
}

// Month and year: "november 2026".
export function formatMonthYear(moment: Moment, language: string): string {
  return new Date(moment).toLocaleDateString(language, { month: 'long', year: 'numeric' });
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * How long ago something happened, in the site's language: "5 min. geleden", "1 uur geleden",
 * "gisteren"; from a week on the plain date instead.
 * @param iso the moment, as an ISO string
 * @param language the language for the wording (i18n.language)
 * @param now the current time, a parameter so the wording can be tested
 * Returns: the text.
 */
export function formatTimeAgo(iso: string, language: string, now: Date = new Date()): string {
  const elapsed = now.getTime() - new Date(iso).getTime();
  if (elapsed >= 7 * DAY) {
    return formatDay(iso, language);
  }

  const relative = new Intl.RelativeTimeFormat(language, { numeric: 'auto', style: 'short' });
  if (elapsed < HOUR) return relative.format(-Math.max(1, Math.round(elapsed / MINUTE)), 'minute');
  if (elapsed < DAY) return relative.format(-Math.round(elapsed / HOUR), 'hour');
  return relative.format(-Math.round(elapsed / DAY), 'day');
}
