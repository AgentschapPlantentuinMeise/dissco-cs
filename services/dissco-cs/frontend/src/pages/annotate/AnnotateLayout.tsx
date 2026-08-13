import React, { useCallback, useState } from 'react';

export interface AnnotateLayoutProps {
  osdViewer: React.ReactNode;
  form: React.ReactNode;
}

export function AnnotateLayout({ osdViewer, form }: AnnotateLayoutProps) {
  const [splitPercent, setSplitPercent] = useState(40);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      const pct = (ev.clientX / window.innerWidth) * 100;
      setSplitPercent(Math.max(15, Math.min(75, pct)));
    };
    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  return (
    <div className="flex flex-row flex-1 min-h-0">
      <div className="flex-shrink-0 bg-[#1e1e1e] flex flex-col overflow-hidden" style={{ width: `${splitPercent}%` }}>
        <div className="flex-1 overflow-hidden min-h-0">{osdViewer}</div>
      </div>

      <div
        className="group w-[6px] flex-shrink-0 cursor-col-resize bg-gray-300 flex items-center justify-center transition-colors duration-150 select-none hover:bg-[var(--cs-primary)] active:bg-[var(--cs-primary)]"
        onMouseDown={handleDividerMouseDown}
      >
        <span className="block w-[2px] h-8 bg-black/25 rounded-sm group-hover:bg-white/50" />
      </div>

      {/* No overflow here — only CaptureModelForm's own fields area scrolls, so the save/submit
          buttons stay pinned at the bottom instead of being pushed off-screen. */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white border-l border-gray-300 min-w-0">{form}</div>
    </div>
  );
}
