import React from 'react';

export function WarningIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 16 16" width="1em" {...props}>
      <path
        d="M8 1.5l7 12.5H1L8 1.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 6.2v3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
