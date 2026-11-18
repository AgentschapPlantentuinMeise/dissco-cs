// options: Intl.NumberFormat options, e.g. { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1 }.
// A number inside a translated sentence is formatted by the translation instead ({{count, number}}).
export function formatNumber(n: number, language: string, options?: Intl.NumberFormatOptions): string {
  return n.toLocaleString(language, options);
}
