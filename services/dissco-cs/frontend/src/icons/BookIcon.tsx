import React from 'react';

export function BookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 16 16" width="1em" {...props}>
      <path
        d="M2 3.5C2 3 2.5 2.5 3.5 2.5c1.6 0 3 .6 4 1.4V13c-1-.8-2.4-1.4-4-1.4-1 0-1.5.3-1.5.6V3.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M14 3.5c0-.5-.5-1-1.5-1-1.6 0-3 .6-4 1.4V13c1-.8 2.4-1.4 4-1.4 1 0 1.5.3 1.5.6V3.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
