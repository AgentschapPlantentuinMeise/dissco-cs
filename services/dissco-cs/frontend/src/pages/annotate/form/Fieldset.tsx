import React from 'react';
import { Disclosure } from '../../../components/ui/Disclosure';

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
    <div className="mb-4">
      <Disclosure
        as="fieldset"
        defaultOpen
        title={
          <>
            {label}
            {required && <span className="text-red-500"> *</span>}
          </>
        }
      >
        {children}
      </Disclosure>
    </div>
  );
}
