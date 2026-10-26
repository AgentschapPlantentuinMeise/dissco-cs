import React, { useRef, useState } from 'react';
import { ResizeHandle } from './ResizeHandle';

export interface AnnotateLayoutProps {
  osdViewer: React.ReactNode;
  form: React.ReactNode;
  // The row of help buttons above the form (and the open panel).
  helpBar: React.ReactNode;
  // The open panel (Uitleg, Info, ...) beside the form; null when none is open.
  panel: React.ReactNode;
}

const PANEL_MIN_WIDTH = 260;
// The form keeps at least the rest of the room beside the image.
const PANEL_MAX_SHARE = 0.6;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function AnnotateLayout({ osdViewer, form, helpBar, panel }: AnnotateLayoutProps) {
  const [splitPercent, setSplitPercent] = useState(40);
  // Kept while the panel is closed, so it opens again at the width the volunteer chose.
  const [panelWidth, setPanelWidth] = useState(360);
  const rowRef = useRef<HTMLDivElement>(null);
  const besideImageRef = useRef<HTMLDivElement>(null);

  const resizeImage = (clientX: number) => {
    const box = rowRef.current?.getBoundingClientRect();
    if (box) setSplitPercent(clamp(((clientX - box.left) / box.width) * 100, 15, 75));
  };

  const resizePanel = (clientX: number) => {
    const box = besideImageRef.current?.getBoundingClientRect();
    if (box) setPanelWidth(clamp(box.right - clientX, PANEL_MIN_WIDTH, box.width * PANEL_MAX_SHARE));
  };

  return (
    <div ref={rowRef} className="flex flex-row flex-1 min-h-0">
      <div className="flex-shrink-0 min-w-[200px] bg-[#1e1e1e] flex flex-col overflow-hidden" style={{ width: `${splitPercent}%` }}>
        <div className="flex-1 overflow-hidden min-h-0">{osdViewer}</div>
      </div>

      <ResizeHandle onDrag={resizeImage} />

      <div ref={besideImageRef} className="flex-1 min-w-0 flex flex-col bg-white border-l border-gray-300">
        {helpBar}
        <div className="flex-1 min-h-0 flex flex-row">
          {/* No overflow here — only CaptureModelForm's own fields area scrolls, so the save/submit
              buttons stay pinned at the bottom instead of being pushed off-screen. */}
          <div className="flex-1 overflow-hidden flex flex-col min-w-0">{form}</div>
          {panel && (
            <>
              <ResizeHandle onDrag={resizePanel} />
              <div className="flex-shrink-0 flex flex-col min-h-0" style={{ width: panelWidth, maxWidth: `${PANEL_MAX_SHARE * 100}%` }}>
                {panel}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
