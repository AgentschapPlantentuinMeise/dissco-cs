export function formatNumber(n: number, language: string): string {
  return n.toLocaleString(language);
}
