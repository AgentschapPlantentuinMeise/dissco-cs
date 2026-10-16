import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePdfPages } from './use-pdf-pages';
import { PdfLightbox } from './PdfLightbox';

// A PDF attachment as a page-image gallery, so a volunteer sees the manual immediately instead of
// having to download it first. Clicking a page opens it in the lightbox. With openDirectly there
// is no gallery, only the lightbox on page 1 (a manual that is just a PDF).
export function PdfGallery({
  url,
  filename,
  openDirectly = false,
  onClose,
}: { url: string; filename: string; openDirectly?: boolean; onClose?: () => void }) {
  const { t } = useTranslation('dissco-cs');
  const { pages, totalPages, failed, loadRest } = usePdfPages(url);
  const [openIndex, setOpenIndex] = useState<number | null>(openDirectly ? 0 : null);

  // Clicking a page opens the readable lightbox -- and starts rendering the remaining pages in the
  // background right away, so paging through does not wait on "show more".
  const openAt = (index: number) => {
    setOpenIndex(index);
    void loadRest();
  };

  // In openDirectly mode there is no thumbnail grid to fall back to -- closing then closes the
  // whole manual instead of only the lightbox.
  const closeLightbox = () => {
    if (openDirectly) {
      onClose?.();
      return;
    }
    setOpenIndex(null);
  };

  // Normally the remaining pages only start loading on a thumbnail click (openAt); in openDirectly
  // mode there is no click, so here as soon as the document has loaded.
  useEffect(() => {
    if (openDirectly && totalPages !== null) {
      void loadRest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDirectly, totalPages]);

  if (failed) {
    return (
      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700">
        <span>{filename}</span>
        <a href={url} download={filename} className="font-semibold text-cs-primary hover:underline">
          {t('manual_pdf_download_original')}
        </a>
      </div>
    );
  }

  const lightbox = openIndex !== null && (
    <PdfLightbox pages={pages} totalPages={totalPages} index={openIndex} onIndexChange={setOpenIndex} onClose={closeLightbox} />
  );

  if (openDirectly) {
    return lightbox || null;
  }

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500">
          {totalPages ? t('manual_pdf_pages_count', { count: totalPages }) : t('manual_pdf_loading')}
        </span>
        <a href={url} download={filename} className="text-xs font-semibold text-cs-primary hover:underline">
          {t('manual_pdf_download_original')}
        </a>
      </div>
      <div className="grid grid-cols-3 gap-2 max-[420px]:grid-cols-2">
        {pages.map((src, index) => (
          <button
            key={index}
            type="button"
            onClick={() => openAt(index)}
            aria-label={t('manual_pdf_page_alt', { page: index + 1 }) as string}
            className="cursor-pointer overflow-hidden rounded border border-gray-200 bg-white p-0 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
          >
            <img src={src} alt="" className="h-32 w-full object-cover object-top" />
          </button>
        ))}
      </div>
      {totalPages !== null && totalPages > pages.length && (
        <button
          type="button"
          onClick={loadRest}
          className="mt-2 border-none bg-transparent p-0 text-xs font-semibold text-cs-primary cursor-pointer hover:underline"
        >
          {t('manual_pdf_show_more', { count: totalPages - pages.length })}
        </button>
      )}

      {lightbox}
    </div>
  );
}
