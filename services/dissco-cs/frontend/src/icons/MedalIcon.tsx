import React from 'react';

export function MedalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="1em"
      viewBox="0 0 24 24"
      width="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="9" r="5.5" />
      <circle cx="12" cy="9" r="1.8" fill="currentColor" stroke="none" />
      <path d="M9 14.5L6.5 21l5.5-3 5.5 3-2.5-6.5" />
    </svg>
  );
}
