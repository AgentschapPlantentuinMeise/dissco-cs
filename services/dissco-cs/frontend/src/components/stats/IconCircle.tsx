import React from 'react';

const TONE = {
  winner: 'bg-award-600',
  in: 'bg-cs-secondary',
} as const;

// The round icon in front of a line on the honour board: amber for a quarter's winner, green when
// you are in the pool.
export function IconCircle({ tone, small = false, children }: {
  tone: keyof typeof TONE;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className={`shrink-0 ${small ? 'w-[30px] h-[30px]' : 'w-[34px] h-[34px]'} rounded-full text-white grid place-items-center ${TONE[tone]}`}>
      {children}
    </span>
  );
}
