import React from 'react';

// Next to a save button that is off: why it cannot be saved yet. Always visible, never only a
// tooltip, which a touch screen does not show and a disabled button often does not either.
export function SaveHint({ children }: { children: React.ReactNode }) {
  return <span className="text-sm text-gray-500">{children}</span>;
}
