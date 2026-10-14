const MAX_MESSAGE = 1000;
const MAX_STACK = 4000;

// Turns anything that was thrown into a message + stack that fit in a log row.
export function describeError(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    return {
      message: (err.message || err.name).slice(0, MAX_MESSAGE),
      stack: err.stack?.slice(0, MAX_STACK),
    };
  }
  const message = typeof err === 'string' ? err : JSON.stringify(err) ?? String(err);
  return { message: message.slice(0, MAX_MESSAGE) };
}
