import React, { useState } from 'react';
import { LuChevronDown } from 'react-icons/lu';

// `collapsible` separates two uses: an entity group gets a fixed frame (a border to show its fields
// belong together, no open/close), while the sections of a 'tabs' model can be opened and closed.
export function Fieldset({
  label,
  required,
  collapsible = true,
  children,
}: {
  label: string;
  required: boolean;
  collapsible?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  if (!collapsible) {
    return (
      <fieldset className="border border-gray-200 rounded mb-4">
        <legend className="w-full px-1">
          <div className="px-2 py-2 text-[0.85rem] font-semibold text-gray-700">
            {label}
            {required && <span className="text-red-500"> *</span>}
          </div>
        </legend>
        <div className="px-3 pb-3">{children}</div>
      </fieldset>
    );
  }

  return (
    <fieldset className="border border-gray-200 rounded mb-4 overflow-hidden">
      <legend className="w-full px-0">
        <button
          type="button"
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[rgba(26,91,102,0.07)] border-b border-[rgba(26,91,102,0.15)] text-[0.92rem] font-bold text-cs-primary cursor-pointer"
          onClick={() => setOpen(o => !o)}
        >
          <span>
            {label}
            {required && <span className="text-red-500"> *</span>}
          </span>
          <LuChevronDown
            aria-hidden="true"
            className={`text-cs-accent flex-shrink-0 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
          />
        </button>
      </legend>
      {open && <div className="px-3.5 py-4">{children}</div>}
    </fieldset>
  );
}
