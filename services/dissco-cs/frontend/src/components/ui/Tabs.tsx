import React from 'react';
import { Tab, TabGroup, TabList } from '@headlessui/react';

export interface TabItem<K extends string> {
  key: K;
  label: React.ReactNode;
}

// A row of tabs: the active one teal with a line below it (style guide, "Bedieningselementen").
// Headless UI adds the tab roles and the arrow-key navigation; the content below the row is the
// caller's, shown for `selected`.
export function Tabs<K extends string>({ tabs, selected, onSelect, label, aside }: {
  tabs: TabItem<K>[];
  selected: K;
  onSelect: (key: K) => void;
  // Read by a screen reader for the row as a whole, e.g. "Language".
  label?: string;
  // Shown on the right of the row, e.g. a count for the active tab.
  aside?: React.ReactNode;
}) {
  const selectedIndex = Math.max(0, tabs.findIndex(tab => tab.key === selected));

  return (
    <TabGroup selectedIndex={selectedIndex} onChange={index => onSelect(tabs[index].key)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 mb-4 border-b border-gray-200">
        <TabList aria-label={label} className="flex flex-wrap gap-1">
          {tabs.map(tab => (
            <Tab
              key={tab.key}
              className="flex items-center gap-1.5 bg-transparent border-0 border-b-2 border-transparent -mb-px px-4 py-2.5 text-[0.9rem] font-medium text-gray-500 cursor-pointer transition-colors duration-150 hover:text-cs-primary data-[selected]:font-semibold data-[selected]:text-cs-primary data-[selected]:border-cs-primary focus:outline-none data-[focus]:outline data-[focus]:outline-2 data-[focus]:outline-cs-accent"
            >
              {tab.label}
            </Tab>
          ))}
        </TabList>
        {aside}
      </div>
    </TabGroup>
  );
}
