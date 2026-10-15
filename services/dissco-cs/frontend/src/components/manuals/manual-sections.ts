export type Section = { heading: string | null; body: string };

// Splits the manual's markdown into accordion sections at every H2 (`## `) heading.
// Content before the first heading (if any) becomes an unlabelled first section.
export function splitIntoSections(markdown: string): Section[] {
  const lines = markdown.split('\n');
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.*)$/);
    if (headingMatch) {
      if (current) {
        sections.push(current);
      }
      current = { heading: headingMatch[1].trim(), body: '' };
    } else if (current) {
      current.body += `${line}\n`;
    } else {
      current = { heading: null, body: `${line}\n` };
    }
  }
  if (current) {
    sections.push(current);
  }

  return sections.filter(section => section.heading !== null || section.body.trim().length > 0);
}

export function toEmbedUrl(url: string): string | null {
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  return null;
}

// Admins can put this token anywhere in a section to embed the attachment gallery exactly there,
// instead of after all sections (the default when the token appears nowhere).
export const ATTACHMENT_MARKER = '{{attachment}}';

export function splitBodyAroundMarker(body: string): [string, string] {
  const index = body.indexOf(ATTACHMENT_MARKER);
  return [body.slice(0, index), body.slice(index + ATTACHMENT_MARKER.length)];
}
