import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { reportClientError } from './cs-client/client-errors';
import { ErrorMessageKey, showError } from './error-toast';

type AppMutationMeta = {
  // Which message the toast shows when this mutation fails (default: error_save_failed).
  errorMessage?: ErrorMessageKey;
  // Set on a mutation whose page shows its own error message, so the global one stays quiet.
  handlesOwnError?: boolean;
};

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: AppMutationMeta;
  }
}

// The message a failed mutation shows the user, or null when the page handles it itself.
export function mutationErrorMessage(meta: AppMutationMeta | undefined): ErrorMessageKey | null {
  if (meta?.handlesOwnError) return null;
  return meta?.errorMessage ?? 'error_save_failed';
}

// Every failed query or mutation ends up here once. Queries are only reported -- pages already
// show load errors inline. Mutations are reported too, and the user gets a message (see
// mutationErrorMessage).
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: error => reportClientError(error, 'query'),
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      reportClientError(error, 'mutation');
      const message = mutationErrorMessage(mutation.meta);
      if (message) {
        showError(message);
      }
    },
  }),
});
