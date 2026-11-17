import React from 'react';

export interface NumberedStep {
  title: string;
  text: string;
}

// A few steps in a row, each with a teal line, its number and a title: "how it works" on Home as a
// section of its own, compact inside a panel (the quarter pool).
export function NumberedSteps({ steps, compact = false }: { steps: NumberedStep[]; compact?: boolean }) {
  return (
    // On a wide screen all steps share one row, however many there are.
    <ol
      className={`list-none m-0 p-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(var(--step-count),minmax(0,1fr))] ${compact ? 'gap-5' : 'gap-7'}`}
      style={{ '--step-count': steps.length } as React.CSSProperties}
    >
      {steps.map((step, index) => (
        <li key={index} className={`border-cs-primary min-w-0 ${compact ? 'border-t-2 pt-2.5' : 'border-t-[3px] pt-3.5'}`}>
          <span className={`block font-bold text-cs-primary leading-none tabular-nums ${compact ? 'text-[1.5rem]' : 'text-[2rem]'}`}>
            {index + 1}
          </span>
          <h3 className={`font-semibold text-gray-900 ${compact ? 'mt-2 mb-1 text-base' : 'mt-2.5 mb-1.5 text-[1.15rem]'}`}>{step.title}</h3>
          <p className={`m-0 text-gray-600 ${compact ? 'text-[0.85rem]' : 'text-[0.93rem]'}`}>{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
