import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LuX } from 'react-icons/lu';
import { IconButton } from '../ui/IconButton';
import { panelClass } from '../ui/panel-styles';

// A management list with its edit form beside it. The form sticks below the navbar while the page
// scrolls, so it stays next to the row being edited however long the list is; with its own
// scrollbar when it is taller than the screen. On a narrow screen it sits below the list and
// scrolls into view when it opens. panelKey: the edited item, so opening another row scrolls too.
export function ListWithPanel({ list, panel, panelTitle, panelKey, onClose }: {
  list: React.ReactNode;
  panel: React.ReactNode | null;
  panelTitle?: React.ReactNode;
  panelKey?: React.Key | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('dissco-cs');
  const panelRef = useRef<HTMLElement>(null);
  const isOpen = panel !== null;

  useEffect(() => {
    if (isOpen) {
      panelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isOpen, panelKey]);

  return (
    <div className="flex flex-col lg:flex-row items-start gap-5 mb-8">
      {/* overflow-x-auto: a table that cannot get narrower scrolls inside its own column instead
          of running underneath the form. */}
      <div className="w-full min-w-0 overflow-x-auto lg:flex-1">{list}</div>
      {isOpen && (
        <aside
          ref={panelRef}
          className={`w-full lg:flex-[0_0_45%] lg:min-w-[400px] lg:sticky lg:top-[calc(var(--cs-navbar-height)+1rem)] lg:max-h-[calc(100vh-var(--cs-navbar-height)-2rem)] lg:overflow-y-auto scroll-mt-navbar ${panelClass}`}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold text-cs-primary m-0">{panelTitle}</h2>
            <IconButton icon={LuX} label={t('common_close')} onClick={onClose} className="flex-shrink-0" />
          </div>
          {panel}
        </aside>
      )}
    </div>
  );
}
