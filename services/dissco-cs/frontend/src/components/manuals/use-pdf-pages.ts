import { useEffect, useRef, useState } from 'react';
import { reportClientError } from '../../api/cs-client/client-errors';

async function renderPageToDataUrl(pdfDoc: any, pageNumber: number): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  // Render at high resolution -- the lightbox shows it almost full screen, so the canvas has to be
  // well above the display size, also on non-retina screens, to stay readable.
  const viewport = page.getViewport({ scale: 2 * (window.devicePixelRatio || 1) });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext('2d');
  if (!context) {
    return '';
  }
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toDataURL('image/png');
}

// Renders a PDF's pages to images, client-side, via pdfjs-dist. Only the first 3 pages render up
// front; loadRest renders the others.
export function usePdfPages(url: string) {
  const [pages, setPages] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const pdfDocRef = useRef<any>(null);
  const loadingRestRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const pdfjs: any = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

        const pdfDoc = await pdfjs.getDocument(url).promise;
        if (cancelled) {
          return;
        }
        pdfDocRef.current = pdfDoc;
        setTotalPages(pdfDoc.numPages);

        const initialCount = Math.min(3, pdfDoc.numPages);
        for (let pageNumber = 1; pageNumber <= initialCount; pageNumber++) {
          if (cancelled) {
            return;
          }
          const dataUrl = await renderPageToDataUrl(pdfDoc, pageNumber);
          if (cancelled) {
            return;
          }
          setPages(prev => [...prev, dataUrl]);
        }
      } catch (err) {
        reportClientError(err, 'action');
        if (!cancelled) {
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  const loadRest = async () => {
    if (loadingRestRef.current) {
      return;
    }
    const pdfDoc = pdfDocRef.current;
    if (!pdfDoc || !totalPages) {
      return;
    }
    loadingRestRef.current = true;
    try {
      for (let pageNumber = pages.length + 1; pageNumber <= totalPages; pageNumber++) {
        const dataUrl = await renderPageToDataUrl(pdfDoc, pageNumber);
        setPages(prev => (prev.length >= pageNumber ? prev : [...prev, dataUrl]));
      }
    } finally {
      loadingRestRef.current = false;
    }
  };

  return { pages, totalPages, failed, loadRest };
}
