import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../api/cs-client/projects';

export function useProjectList(page = 1, options: { published?: boolean } = {}) {
  return useQuery({
    queryKey: ['site-projects', page, options.published],
    queryFn: () => projectsApi.list({ page, ...options }),
    staleTime: 0,
  });
}
