import { reportClientError } from './cs-client/client-errors';

/**
 * Whether a window error event is one of ours. Without an error object the browser hid the details
 * (a script from another origin, e.g. a browser extension); a file from another origin is not our
 * code either. Reporting those would fill app_log with errors we cannot fix.
 * @param event the error event's error object and the file it came from (empty when unknown)
 * @param origin the page's own origin (window.location.origin)
 * Returns: true when it should be reported.
 */
export function isOwnScriptError(event: { error: unknown; filename: string }, origin: string): boolean {
  if (!event.error) {
    return false;
  }
  return !event.filename || event.filename.startsWith(origin);
}

// Errors outside React's rendering never reach the error boundary or react-query: a throw in a
// click handler or a timer, or a promise nobody awaited. These listeners report them to app_log;
// the user sees nothing, as before.
export function listenForUncaughtErrors(): void {
  window.addEventListener('error', event => {
    if (isOwnScriptError(event, window.location.origin)) {
      reportClientError(event.error, 'uncaught');
    }
  });
  window.addEventListener('unhandledrejection', event => {
    reportClientError(event.reason, 'uncaught');
  });
}
