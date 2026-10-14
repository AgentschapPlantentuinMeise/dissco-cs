import React from 'react';

// A whole page that couldn't be shown, with a human explanation and a way forward. Used for load
// errors (and expected dead ends like a full task) instead of an inline technical message -- the
// text is always a translation, never the server's own message.
export function PageError({
  title,
  text,
  role = 'alert',
  children,
}: {
  title: string;
  text: string;
  // 'status' for an expected situation that isn't really an error (e.g. a task that is full).
  role?: 'alert' | 'status';
  children?: React.ReactNode;
}) {
  return (
    <div role={role} className="max-w-xl mx-auto px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-[var(--cs-dark)] mb-3">{title}</h1>
      <p className="text-gray-700 mb-6">{text}</p>
      {children && <div className="flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

// The two button looks from the style guide, for PageError's actions.
export const pageErrorPrimaryButton =
  'px-4 py-2 rounded text-sm font-semibold border-2 border-[var(--cs-primary)] bg-[var(--cs-primary)] text-white cursor-pointer hover:bg-[var(--cs-dark)] hover:border-[var(--cs-dark)] disabled:opacity-60 disabled:cursor-not-allowed';
export const pageErrorSecondaryButton =
  'px-4 py-2 rounded text-sm font-semibold border-2 border-[var(--cs-primary)] bg-transparent text-[var(--cs-primary)] cursor-pointer hover:bg-[var(--cs-primary)] hover:text-white';
