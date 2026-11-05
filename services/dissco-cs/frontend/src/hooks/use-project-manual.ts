import { useQuery } from '@tanstack/react-query';
import { projectQueries } from '../api/queries/projects';

// The manual linked to a project. Without a linked manual the server answers 404, so data stays
// undefined; that is how a page knows not to offer the manual.
export function useProjectManual(projectSlug: string | undefined) {
  return useQuery({ ...projectQueries.manual(projectSlug), staleTime: 5 * 60 * 1000 });
}
