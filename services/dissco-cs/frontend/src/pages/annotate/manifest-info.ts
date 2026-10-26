const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };

/**
 * A IIIF metadata value as plain text. IIIF lets a value hold a little HTML (<a>, <b>, <br>, ...);
 * the Info panel shows only its text, so no markup from an outside source ends up in the page.
 * @param value the value in one language, e.g. 'Collected by <i>J. Smith</i>'
 * Returns: the text, a <br> as a line break, e.g. 'Collected by J. Smith'.
 */
export function plainText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, entity: string) => ENTITIES[entity])
    .trim();
}

/**
 * Whether a value is only a web address, so the Info panel can show it as a link.
 * @param value the plain text of a value
 */
export function isWebLink(value: string): boolean {
  return /^https?:\/\/\S+$/.test(value);
}
