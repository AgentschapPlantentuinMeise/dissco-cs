import React from 'react';
import { ChevronIcon } from '../icons/ChevronIcon';

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
};

// Shared dropdown control. Every <select> in the app should render through this instead of a bare
// <select> -- browsers each draw their own native arrow/weighting for <select>, which is why every
// hand-rolled dropdown in this codebase ended up looking slightly different. appearance-none hides
// that native rendering; the ChevronIcon here is the one consistent arrow used everywhere.
export const Select = React.forwardRef<HTMLSelectElement, Props>(
  ({ className = '', wrapperClassName = '', children, value, ...props }, ref) => {
    // An empty value is always a "nothing chosen" state (placeholder option, "all", "none", ...)
    // across every dropdown in the app -- muting it to the same gray as text-input placeholders
    // keeps it from reading as a loud, deliberate selection.
    const isPlaceholder = value === '' || value === undefined;

    return (
      <div className={`relative ${wrapperClassName}`}>
        <select
          ref={ref}
          value={value}
          className={`w-full appearance-none pr-8 ${isPlaceholder ? 'text-gray-400' : ''} ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronIcon
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
        />
      </div>
    );
  }
);
Select.displayName = 'Select';
