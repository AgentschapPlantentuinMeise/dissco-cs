import { InternationalString } from '../components/LocaleString';

export function localeText(label: InternationalString | string | undefined, language: string): string {
  if (!label) return '';
  if (typeof label === 'string') return label;
  const candidate = label[language] || Object.values(label)[0];
  return candidate ? candidate.join(' ') : '';
}
