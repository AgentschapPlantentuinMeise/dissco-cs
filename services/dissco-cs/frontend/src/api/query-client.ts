import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { reportClientError } from './cs-client/client-errors';
import { showError } from '../hooks/use-toast';

declare module '@tanstack/react-query' {
  interface Register {
    // Set on a mutation whose page shows its own error message, so the global one stays quiet.
    mutationMeta: { handlesOwnError?: boolean };
  }
}

// Every failed query or mutation ends up here once. Queries are only reported -- pages already
// show load errors inline. Mutations are reported too, and (unless the mutation handles its own
// error) the user gets a message.
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: error => reportClientError(error, 'query'),
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      reportClientError(error, 'mutation');
      if (!mutation.meta?.handlesOwnError) {
        showError('error_save_failed');
      }
    },
  }),
});
