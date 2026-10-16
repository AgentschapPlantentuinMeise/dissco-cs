import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { LuX, LuArrowLeft, LuArrowRight, LuMinus, LuPlus } from 'react-icons/lu';

const roundButtonClass =
  'flex items-center justify-center rounded-full border-none bg-white/10 text-white cursor-pointer hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30';

// One PDF page almost full screen, with page arrows, zoom (buttons, +/- keys, ctrl+scroll) and
// Escape to close. Zoom starts at 100% each time the lightbox opens.
export function PdfLightbox({ pages, totalPages, index, onIndexChange, onClose }: {
  pages: string[];
  totalPages: number | null;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('dissco-cs');
  const [zoom, setZoom] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const goTo = (next: number) => {
    if (totalPages === null || next < 0 || next >= totalPages) {
      return;
    }
    onIndexChange(next);
  };

  const zoomIn = () => setZoom(z => Math.min(3, Math.round((z + 0.5) * 100) / 100));
  const zoomOut = () => setZoom(z => Math.max(1, Math.round((z - 0.5) * 100) / 100));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowRight') {
        goTo(index + 1);
      } else if (event.key === 'ArrowLeft') {
        goTo(index - 1);
      } else if (event.key === '+' || event.key === '=') {
        zoomIn();
      } else if (event.key === '-') {
        zoomOut();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, totalPages]);

  // Ctrl/Cmd+scroll zooms -- plain scrolling keeps panning the enlarged page. React's onWheel prop
  // cannot reliably preventDefault() (passive listener), so a real DOM listener is needed to stop
  // the browser's own ctrl+scroll zoom.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }
      event.preventDefault();
      setZoom(z => Math.min(3, Math.max(1, Math.round((z + (event.deltaY < 0 ? 0.5 : -0.5)) * 100) / 100)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return createPortal(
    // Rendered through a portal straight into document.body, so the fixed lightbox is not trapped
    // inside the (transformed) modal card. One scrolling background div is both the click-to-close
    // area and the panel that pans -- the header bar stays visible via position:sticky (no separate
    // fixed elements that could intercept each other's clicks).
    <div
      ref={scrollContainerRef}
      // top-[70px]: keeps the fixed site navbar (.cs-navbar, 70px high) visible above the lightbox
      // instead of covering it -- so the z-index only has to beat the base Modal (z-50), not the
      // navbar (z-200).
      className="fixed inset-x-0 bottom-0 top-[70px] z-[60] overflow-auto bg-black/90"
      onClick={onClose}
    >
      <div
        className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-black/90 p-4 text-white"
        onClick={e => e.stopPropagation()}
      >
        <span className="text-sm font-semibold">
          {t('manual_pdf_page_counter', { page: index + 1, total: totalPages ?? '…' })}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= 1}
            aria-label={t('manual_pdf_zoom_out') as string}
            className={`h-9 w-9 text-lg font-bold ${roundButtonClass}`}
          >
            <LuMinus aria-hidden="true" />
          </button>
          <span className="w-12 text-center text-xs font-semibold tabular-nums">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= 3}
            aria-label={t('manual_pdf_zoom_in') as string}
            className={`h-9 w-9 text-lg font-bold ${roundButtonClass}`}
          >
            <LuPlus aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common_close') as string}
            className={`ml-1 h-9 w-9 ${roundButtonClass}`}
          >
            <LuX />
          </button>
        </div>
      </div>

      <div
        className="flex min-h-[calc(100%-4.5rem)] items-center justify-center p-4"
        onClick={e => e.stopPropagation()}
      >
        {pages[index] ? (
          // maxWidth/maxHeight as inline style (not Tailwind's w-/h-full) because an inline style
          // does override the global Tailwind reset "img{max-width:100%}" (same property, higher
          // specificity) -- transform:scale() then zooms past that limit, and the overflow-auto
          // parent scrolls along.
          <img
            src={pages[index]}
            alt={t('manual_pdf_page_alt', { page: index + 1 }) as string}
            style={{
              maxWidth: 'calc(100vw - 2rem)',
              maxHeight: 'calc(100vh - 6.5rem)',
              transform: `scale(${zoom})`,
              // transformOrigin 'top': scales downwards instead of from the centre -- otherwise
              // zooming in pushes the top above the scroll container, out of reach (scrollTop
              // cannot go negative).
              transformOrigin: 'top',
            }}
          />
        ) : (
          <span className="text-sm text-white/70">{t('manual_pdf_loading')}</span>
        )}
      </div>

      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          goTo(index - 1);
        }}
        disabled={index === 0}
        aria-label={t('manual_pdf_prev_page') as string}
        className={`fixed left-4 top-1/2 z-10 -translate-y-1/2 h-11 w-11 ${roundButtonClass}`}
      >
        <LuArrowLeft />
      </button>
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          goTo(index + 1);
        }}
        disabled={totalPages === null || index >= totalPages - 1}
        aria-label={t('manual_pdf_next_page') as string}
        className={`fixed right-4 top-1/2 z-10 -translate-y-1/2 h-11 w-11 ${roundButtonClass}`}
      >
        <LuArrowRight />
      </button>
    </div>,
    document.body
  );
}
