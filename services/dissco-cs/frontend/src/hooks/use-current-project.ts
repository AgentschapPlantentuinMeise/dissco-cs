import { useQuery } from '@tanstack/react-query';
import { projectQueries } from '../api/queries/projects';
import { useRouteContext } from './use-route-context';

export function useCurrentProject() {
  const { projectSlug } = useRouteContext();
  return useQuery(projectQueries.detail(projectSlug));
}
