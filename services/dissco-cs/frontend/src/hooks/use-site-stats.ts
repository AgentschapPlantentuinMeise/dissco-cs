import { useQuery } from 'react-query';
import { statsApi } from '../api/cs-api';

export function useSiteStats() {
  return useQuery('site-stats', () => statsApi.get());
}
