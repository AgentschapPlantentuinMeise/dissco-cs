import { useQuery } from 'react-query';
import { madocClient } from '../api/madoc-client';
import { useRouteContext } from './use-route-context';

export function useProject() {
  const { projectId } = useRouteContext();
  return useQuery(['project', projectId], () => madocClient.getSiteProject(projectId!), {
    enabled: !!projectId,
  });
}
