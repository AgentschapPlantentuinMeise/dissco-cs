import React from 'react';
import { Disclosure as HeadlessDisclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { LuChevronDown } from 'react-icons/lu';

// A block that opens and closes under its title (style guide, "Bedieningselementen"): light teal
// header with a chevron that turns. Headless UI keeps the open state and sets aria-expanded.
// `as="fieldset"` keeps a group of form fields a real fieldset, with the title as its legend.
// `action` is a control in the header. It sits next to the button, not in it: a button inside a
// button is invalid HTML, and a click on it would open or close the block as well.
export function Disclosure({ title, defaultOpen = false, as = 'div', action, children }: {
  title: React.ReactNode;
  defaultOpen?: boolean;
  as?: 'div' | 'fieldset';
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const header = (
    <div className="relative">
      <DisclosureButton className="group w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-cs-primary/[0.07] border-0 data-[open]:border-b border-solid border-cs-primary/15 text-left text-[0.92rem] font-semibold text-cs-primary cursor-pointer">
        <span>{title}</span>
        <LuChevronDown aria-hidden="true" className="text-cs-accent flex-shrink-0 transition-transform duration-200 group-data-[open]:rotate-180" />
      </DisclosureButton>
      {action && <span className="absolute right-10 top-1/2 -translate-y-1/2">{action}</span>}
    </div>
  );

  return (
    <HeadlessDisclosure as={as} defaultOpen={defaultOpen} className="border border-gray-200 rounded overflow-hidden">
      {as === 'fieldset' ? <legend className="w-full p-0">{header}</legend> : header}
      <DisclosurePanel className="px-3.5 py-4">{children}</DisclosurePanel>
    </HeadlessDisclosure>
  );
}
