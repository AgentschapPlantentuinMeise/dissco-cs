export function formatDate(iso: string, language: string): string {
  return new Date(iso).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' });
}
