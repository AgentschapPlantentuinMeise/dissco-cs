import React, { useCallback, useState } from 'react';
import { MiradorIframeToggle } from './viewer/MiradorIframeToggle';

export interface AnnotateLayoutProps {
  osdViewer: React.ReactNode;
  manifestUrl: string;
  form: React.ReactNode;
}

export function AnnotateLayout({ osdViewer, manifestUrl, form }: AnnotateLayoutProps) {
  const [showMirador, setShowMirador] = useState(false);
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
        <div className="flex justify-end px-2 pt-1 bg-[var(--cs-primary)]">
          <button
            className="bg-transparent text-white/90 border border-white/35 rounded px-2 py-[2px] text-[0.75rem] cursor-pointer hover:bg-white/[0.18]"
            onClick={() => setShowMirador(v => !v)}
          >
            {showMirador ? 'Standaard viewer' : 'Open in Mirador'}
          </button>
        </div>
        <div className="flex-1 overflow-hidden min-h-0">
          {showMirador ? <MiradorIframeToggle manifestUrl={manifestUrl} height="100%" /> : osdViewer}
        </div>
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
