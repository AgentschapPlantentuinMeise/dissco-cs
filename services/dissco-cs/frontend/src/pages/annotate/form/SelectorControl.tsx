import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuCheck } from 'react-icons/lu';
import { DocumentPath } from '../../../utility/annotation-document';

export interface SelectorControls {
  drawingPath?: DocumentPath | null;
  onRequestDraw?: (path: DocumentPath) => void;
  onCancelDraw?: () => void;
  onClearSelector?: (path: DocumentPath) => void;
}

// Under a field with a selector: draw a region on the image, redraw it, or clear it.
export function SelectorControl({ path, hasRegion, isDrawing, controls }: {
  path: DocumentPath;
  hasRegion: boolean;
  isDrawing: boolean;
  controls: SelectorControls;
}) {
  const { t } = useTranslation('dissco-cs');

  if (isDrawing) {
    return (
      <div className="mt-1 flex items-center gap-2 text-[0.8rem] text-cs-primary">
        <span>{t('annotate_draw_hint')}</span>
        <button type="button" className="text-gray-500 underline" onClick={() => controls.onCancelDraw?.()}>
          {t('common_cancel')}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-2 text-[0.8rem]">
      {hasRegion && (
        <span className="inline-flex items-center gap-1 text-cs-primary">
          <LuCheck aria-hidden="true" /> {t('annotate_region_marked')}
        </span>
      )}
      <button
        type="button"
        className="text-cs-primary underline"
        onClick={() => controls.onRequestDraw?.(path)}
      >
        {hasRegion ? t('annotate_redraw') : t('annotate_draw_on_image')}
      </button>
      {hasRegion && (
        <button type="button" className="text-gray-500 underline" onClick={() => controls.onClearSelector?.(path)}>
          {t('annotate_clear_region')}
        </button>
      )}
    </div>
  );
}
