import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { madocClient } from '../../api/madoc-client';
import { parseUrn } from '../../utility/parse-urn';
import { getImageServiceId } from '../../utility/get-image-service-id';
import { OpenSeadragonViewer } from '../annotate/viewer/OpenSeadragonViewer';
import { CloseIcon } from '../../icons/CloseIcon';

export interface ImagePreviewPopupProps {
  /** Raw subject urn of the task -- canvas of manifest, bv. urn:madoc:canvas:123 of urn:madoc:manifest:456. */
  subject: string;
  label?: string;
  onClose: () => void;
}

export const ImagePreviewPopup: React.FC<ImagePreviewPopupProps> = ({ subject, label, onClose }) => {
  const { t } = useTranslation('dissco-cs');
  const parsed = parseUrn(subject);
  const isManifest = parsed?.type === 'manifest';

  // Bij een manifest-subject (project op manifest-granulariteit, geen losse canvas per taak)
  // eerst de structuur ophalen zodat er iets te tonen valt -- default op de eerste canvas, met
  // vorige/volgende via OpenSeadragonViewer's eigen ingebouwde navigatie (zelfde patroon als
  // AnnotatePage.tsx bij manifest-granulariteit-projecten).
  const { data: structure } = useQuery(
    ['review-preview-structure', parsed?.id],
    () => madocClient.getManifestStructure(parsed!.id),
    { enabled: isManifest, retry: false }
  );
  const canvases = structure?.items ?? [];
  const [canvasIndex, setCanvasIndex] = useState(0);

  const canvasId = isManifest ? canvases[canvasIndex]?.id : parsed?.type === 'canvas' ? parsed.id : undefined;

  const { data: canvasJson, isError: canvasError } = useQuery(
    ['review-preview-canvas', canvasId],
    () => madocClient.getSiteCanvas(canvasId as number),
    { enabled: !!canvasId, retry: false }
  );

  const imageServiceId = canvasJson ? getImageServiceId(canvasJson.canvas) : undefined;
  const structureEmpty = isManifest && !!structure && canvases.length === 0;
  const unavailable = !parsed || structureEmpty || canvasError || (!!canvasJson && !imageServiceId);

  const [position, setPosition] = useState(() => ({
    x: Math.max(20, window.innerWidth / 2 - 320),
    y: 100,
  }));
  const dragOffset = useRef({ x: 0, y: 0 });

  const [size, setSize] = useState({ width: 640, height: 480 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0 });

  const handleTitleBarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    const onMove = (ev: MouseEvent) => {
      setPosition({ x: ev.clientX - dragOffset.current.x, y: ev.clientY - dragOffset.current.y });
    };
    const onUp = () => {
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleResizeMouseDown = (direction: 'e' | 's' | 'w' | 'se') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeStart.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height, posX: position.x };
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - resizeStart.current.x;
      const dy = ev.clientY - resizeStart.current.y;

      if (direction === 'e' || direction === 'se') {
        const width = Math.min(window.innerWidth * 0.95, Math.max(320, resizeStart.current.width + dx));
        setSize(prev => ({ ...prev, width }));
      } else if (direction === 'w') {
        const width = Math.min(window.innerWidth * 0.95, Math.max(320, resizeStart.current.width - dx));
        setSize(prev => ({ ...prev, width }));
        setPosition(prev => ({ ...prev, x: resizeStart.current.posX + (resizeStart.current.width - width) }));
      }

      if (direction === 's' || direction === 'se') {
        const height = Math.min(window.innerHeight * 0.9, Math.max(240, resizeStart.current.height + dy));
        setSize(prev => ({ ...prev, height }));
      }
    };
    const onUp = () => {
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div
      className="fixed z-[200] max-w-[95vw] max-h-[90vh] bg-white rounded-lg shadow-[0_25px_60px_rgba(0,0,0,0.35)] border border-gray-200 flex flex-col overflow-hidden"
      style={{ left: position.x, top: position.y, width: size.width, height: size.height }}
    >
      <div
        className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-2 bg-[var(--cs-primary)] text-white cursor-move select-none"
        onMouseDown={handleTitleBarMouseDown}
      >
        <span className="text-sm font-medium truncate">{label ?? t('review_preview_title')}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common_close')}
          className="flex-shrink-0 bg-transparent border-none text-white/90 cursor-pointer hover:text-white p-1"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="flex-1 min-h-0 bg-[#1e1e1e] relative">
        {unavailable && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-gray-300 px-4 text-center">
            {t('review_preview_unavailable')}
          </p>
        )}
        {!unavailable && imageServiceId && (
          <OpenSeadragonViewer
            imageServiceId={imageServiceId}
            height="100%"
            canvasIndex={isManifest ? canvasIndex : undefined}
            totalCanvases={isManifest ? canvases.length : undefined}
            onPrevCanvas={isManifest && canvasIndex > 0 ? () => setCanvasIndex(i => i - 1) : undefined}
            onNextCanvas={isManifest && canvasIndex < canvases.length - 1 ? () => setCanvasIndex(i => i + 1) : undefined}
          />
        )}
      </div>
      <div onMouseDown={handleResizeMouseDown('e')} className="absolute top-0 right-0 bottom-0 w-1.5 cursor-ew-resize" />
      <div onMouseDown={handleResizeMouseDown('w')} className="absolute top-0 left-0 bottom-0 w-1.5 cursor-ew-resize" />
      <div onMouseDown={handleResizeMouseDown('s')} className="absolute left-0 right-0 bottom-0 h-1.5 cursor-ns-resize" />
      <div
        onMouseDown={handleResizeMouseDown('se')}
        className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize"
        style={{
          background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.35) 50%)',
        }}
      />
    </div>
  );
};
