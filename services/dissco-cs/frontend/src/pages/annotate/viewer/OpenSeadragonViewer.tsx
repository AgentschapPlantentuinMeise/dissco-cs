import React, { useEffect, useRef, useState } from 'react';
import OpenSeadragon from 'openseadragon';
import { BoxSelectorState } from '../../../capture-model/types/selector-types';

export interface OpenSeadragonViewerProps {
  imageServiceId?: string;
  height?: string;
  canvasLabel?: string;
  canvasIndex?: number;
  totalCanvases?: number;
  onPrevCanvas?: () => void;
  onNextCanvas?: () => void;
  /** When set, the viewer enters "draw a box" mode and reports the drawn region once. */
  drawingSelector?: boolean;
  onSelectorDrawn?: (state: BoxSelectorState) => void;
  onCancelDrawing?: () => void;
  /** Regions already saved on other fields, drawn as persistent (non-interactive) overlays. */
  savedSelectors?: Array<{ id: string; state: BoxSelectorState }>;
}

const btnClass =
  'bg-transparent text-white/90 border border-white/35 rounded px-2 py-[3px] text-[0.85rem] cursor-pointer leading-none transition-[background] duration-150 hover:bg-white/[0.18] hover:border-white/60 disabled:opacity-30 disabled:cursor-default';

export function OpenSeadragonViewer({
  imageServiceId,
  height = '100%',
  canvasLabel,
  canvasIndex,
  totalCanvases,
  onPrevCanvas,
  onNextCanvas,
  drawingSelector,
  onSelectorDrawn,
  onCancelDrawing,
  savedSelectors,
}: OpenSeadragonViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !imageServiceId) return;

    const viewer = OpenSeadragon({
      element: containerRef.current,
      tileSources: `${imageServiceId.replace(/\/$/, '')}/info.json`,
      showNavigationControl: false,
      gestureSettingsMouse: { clickToZoom: false },
    });
    viewerRef.current = viewer;

    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [imageServiceId]);

  useEffect(() => {
    viewerRef.current?.viewport.setRotation(rotation);
  }, [rotation]);

  useEffect(() => {
    const canvasEl = containerRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    if (canvasEl) canvasEl.style.filter = `brightness(${brightness}%)`;
  }, [brightness]);

  // Box-selector drag-to-draw, active only while `drawingSelector` is true. Mouse nav (pan/zoom)
  // is disabled for the duration — otherwise OpenSeadragon's own drag-to-pan handler fights this
  // tracker for the same drag gesture and the image moves under the box instead of drawing it.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !drawingSelector) return;

    viewer.setMouseNavEnabled(false);

    let start: OpenSeadragon.Point | null = null;
    let overlayEl: HTMLDivElement | null = null;

    const tracker = new OpenSeadragon.MouseTracker({
      element: viewer.canvas,
      pressHandler: evt => {
        start = viewer.viewport.viewerElementToImageCoordinates(evt.position);
        overlayEl = document.createElement('div');
        overlayEl.style.position = 'absolute';
        overlayEl.style.border = '2px solid #ffb703';
        overlayEl.style.background = 'rgba(255,183,3,0.2)';
        // addOverlay/updateOverlay expect viewport-relative coordinates, not image pixels —
        // without this conversion the box is positioned far outside the visible viewport.
        viewer.addOverlay(overlayEl, viewer.viewport.imageToViewportRectangle(new OpenSeadragon.Rect(start.x, start.y, 0, 0)));
      },
      dragHandler: evt => {
        if (!start || !overlayEl) return;
        const current = viewer.viewport.viewerElementToImageCoordinates(evt.position);
        const rect = new OpenSeadragon.Rect(
          Math.min(start.x, current.x),
          Math.min(start.y, current.y),
          Math.abs(current.x - start.x),
          Math.abs(current.y - start.y)
        );
        viewer.updateOverlay(overlayEl, viewer.viewport.imageToViewportRectangle(rect));
      },
      releaseHandler: evt => {
        if (!start || !overlayEl) return;
        const end = viewer.viewport.viewerElementToImageCoordinates(evt.position);
        const state: BoxSelectorState = {
          x: Math.round(Math.min(start.x, end.x)),
          y: Math.round(Math.min(start.y, end.y)),
          width: Math.round(Math.abs(end.x - start.x)),
          height: Math.round(Math.abs(end.y - start.y)),
        };
        viewer.removeOverlay(overlayEl);
        start = null;
        overlayEl = null;
        if (state.width > 2 && state.height > 2) {
          onSelectorDrawn?.(state);
        }
      },
    });

    return () => {
      tracker.destroy();
      if (overlayEl) viewer.removeOverlay(overlayEl);
      viewer.setMouseNavEnabled(true);
    };
  }, [drawingSelector, onSelectorDrawn]);

  // Persistent overlays for regions already saved on other fields — non-interactive, so they
  // don't interfere with the drag-to-draw tracker above.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !savedSelectors?.length) return;

    const overlayEls = savedSelectors
      .filter(({ state }) => !!state)
      .map(({ state }) => {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.border = '2px solid var(--cs-primary)';
        el.style.background = 'rgba(0,0,0,0.04)';
        el.style.pointerEvents = 'none';
        viewer.addOverlay(
          el,
          viewer.viewport.imageToViewportRectangle(new OpenSeadragon.Rect(state!.x, state!.y, state!.width, state!.height))
        );
        return el;
      });

    return () => {
      overlayEls.forEach(el => viewer.removeOverlay(el));
    };
  }, [savedSelectors, imageServiceId]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center h-[40px] px-3 bg-[var(--cs-primary)] flex-shrink-0 select-none gap-[6px]">
        <div className="flex items-center gap-[6px] flex-1">
          <button className={btnClass} onClick={onPrevCanvas} disabled={!onPrevCanvas}>←</button>
          <span className="text-white/85 text-[0.8rem] whitespace-nowrap truncate max-w-[160px]">
            {totalCanvases ? `${(canvasIndex ?? 0) + 1} / ${totalCanvases}` : canvasLabel}
          </span>
          <button className={btnClass} onClick={onNextCanvas} disabled={!onNextCanvas}>→</button>
        </div>
        <div className="flex items-center gap-2">
          <button className={btnClass} onClick={() => setRotation(r => r - 90)} aria-label="Roteer links">⟲</button>
          <button className={btnClass} onClick={() => setRotation(r => r + 90)} aria-label="Roteer rechts">⟳</button>
          <input
            type="range"
            min={50}
            max={150}
            value={brightness}
            onChange={e => setBrightness(Number(e.target.value))}
            aria-label="Helderheid"
            className="w-[80px]"
          />
        </div>
        {drawingSelector && (
          <button className={btnClass} onClick={onCancelDrawing}>Annuleer</button>
        )}
      </div>
      <div ref={containerRef} style={{ height }} className="flex-1 bg-[#1e1e1e]" />
    </div>
  );
}
