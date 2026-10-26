export function formatDate(iso: string, language: string): string {
  return new Date(iso).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' });
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
    return new Date(iso).toLocaleDateString(language, { dateStyle: 'short' });
  }

  const relative = new Intl.RelativeTimeFormat(language, { numeric: 'auto', style: 'short' });
  if (elapsed < HOUR) return relative.format(-Math.max(1, Math.round(elapsed / MINUTE)), 'minute');
  if (elapsed < DAY) return relative.format(-Math.round(elapsed / HOUR), 'hour');
  return relative.format(-Math.round(elapsed / DAY), 'day');
}
