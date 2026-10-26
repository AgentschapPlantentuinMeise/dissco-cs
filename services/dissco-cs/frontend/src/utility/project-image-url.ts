import { MadocProjectDto } from '@dissco-cs/shared-types';

// Madoc's project list sends the image as `thumbnail` (a URL, or an object with the URL as `id`);
// a single project only has `placeholderImage`.
export function projectImageUrl(project: Pick<MadocProjectDto, 'thumbnail' | 'placeholderImage'>): string | undefined {
  const thumbnail = typeof project.thumbnail === 'string' ? project.thumbnail : project.thumbnail?.id;
  return thumbnail || project.placeholderImage || undefined;
}
