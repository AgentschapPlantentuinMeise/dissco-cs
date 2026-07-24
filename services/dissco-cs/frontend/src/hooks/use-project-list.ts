import { useQuery } from 'react-query';
import { madocClient } from '../api/madoc-client';

export function useProjectList(page = 1) {
  return useQuery(['site-projects', page], () => madocClient.getSiteProjects({ page }), { staleTime: 0 });
}
