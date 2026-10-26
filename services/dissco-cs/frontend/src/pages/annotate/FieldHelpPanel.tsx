import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FieldHelp } from './field-help';
import { HelpTarget } from './use-annotate-panel';

// The Uitleg panel: the model's instructions, then per group the fields that have a description.
// Opened from a field's question mark, it scrolls to that field's help and lights it up briefly.
export function FieldHelpPanel({ help, target }: { help: FieldHelp; target: HelpTarget | null }) {
  const { t } = useTranslation('dissco-cs');
  const [litKey, setLitKey] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!target) return;
    itemRefs.current.get(target.key)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    setLitKey(target.key);
    const timer = setTimeout(() => setLitKey(null), 2400);
    return () => clearTimeout(timer);
  }, [target]);

  if (help.instructions.length === 0 && help.groups.length === 0) {
    return <p className="m-0 text-gray-500">{t('annotate_help_empty')}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {help.instructions.map((instruction, index) => (
        <p key={index} className="m-0 px-3 py-2.5 bg-cs-primary/[0.06] text-gray-700 whitespace-pre-line">
          {instruction}
        </p>
      ))}
      {help.groups.map(group => (
        <section key={group.key} className="flex flex-col gap-1">
          {group.label && <h3 className="m-0 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-gray-500">{group.label}</h3>}
          {group.intro && <p className="m-0 text-gray-700 whitespace-pre-line">{group.intro}</p>}
          {group.items.map(item => (
            <div
              key={item.key}
              ref={element => {
                if (element) itemRefs.current.set(item.key, element);
                else itemRefs.current.delete(item.key);
              }}
              className={`px-3 py-2 border-l-[3px] scroll-mt-2 transition-colors duration-700 ${
                litKey === item.key ? 'border-l-cs-secondary bg-cs-secondary/15' : 'border-l-transparent'
              }`}
            >
              <h4 className="m-0 text-[0.88rem] font-semibold text-gray-800">{item.label}</h4>
              <p className="m-0 mt-0.5 text-gray-700 whitespace-pre-line">{item.description}</p>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
