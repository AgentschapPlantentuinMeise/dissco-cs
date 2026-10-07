import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../api/cs-client/projects';
import { useRouteContext } from './use-route-context';

export function useProject() {
  const { projectId } = useRouteContext();
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });
}
