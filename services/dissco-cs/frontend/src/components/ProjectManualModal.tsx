import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import ReactMarkdown from 'react-markdown';
import { Modal } from './Modal';
import { LuChevronDown, LuX, LuArrowLeft, LuArrowRight } from 'react-icons/lu';
import { projectManualsApi, SitePageLang } from '../api/cs-api';

type ProjectManualModalProps = {
  projectSlug: string;
  projectLabel?: string;
  open: boolean;
  onClose: () => void;
  onShown?: () => void;
};

type Section = { heading: string | null; body: string };

// Splits the manual's markdown into accordion sections at every H2 (`## `) heading.
// Content before the first heading (if any) becomes an unlabelled first section.
function splitIntoSections(markdown: string): Section[] {
  const lines = markdown.split('\n');
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.*)$/);
    if (headingMatch) {
      if (current) {
        sections.push(current);
      }
      current = { heading: headingMatch[1].trim(), body: '' };
    } else if (current) {
      current.body += `${line}\n`;
    } else {
      current = { heading: null, body: `${line}\n` };
    }
  }
  if (current) {
    sections.push(current);
  }

  return sections.filter(section => section.heading !== null || section.body.trim().length > 0);
}

function toEmbedUrl(url: string): string | null {
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  return null;
}

function displayText(field: Partial<Record<SitePageLang, string>> | undefined, lang: string, fallback: string): string {
  if (!field) {
    return fallback;
  }
  return field[lang as SitePageLang] || field.nl || field.en || field.fr || field.de || fallback;
}

// Beheerders kunnen dit token ergens in een sectie plaatsen om de bijlage-galerij daar
// exact in te bedden i.p.v. steeds achteraan alle secties (het huidige, altijd-werkende
// standaardgedrag als het token nergens voorkomt).
export const ATTACHMENT_MARKER = '{{attachment}}';

function splitBodyAroundMarker(body: string): [string, string] {
  const index = body.indexOf(ATTACHMENT_MARKER);
  return [body.slice(0, index), body.slice(index + ATTACHMENT_MARKER.length)];
}

const markdownComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    const embedUrl = href ? toEmbedUrl(href) : null;
    if (embedUrl) {
      return (
        <span className="my-3 block aspect-video overflow-hidden rounded-lg">
          <iframe
            src={embedUrl}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={typeof children === 'string' ? children : 'video'}
          />
        </span>
      );
    }
    return (
      <a href={href} target="_blank" rel="noreferrer" className="text-[var(--cs-primary)] underline">
        {children}
      </a>
    );
  },
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mb-2 mt-0 text-base font-semibold text-[var(--cs-primary)]">{children}</h4>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h5 className="mb-2 mt-3 text-sm font-semibold text-[var(--cs-primary)]">{children}</h5>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 text-[0.87rem] leading-relaxed text-gray-700 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 list-disc pl-5 text-[0.87rem] leading-relaxed text-gray-700">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 list-decimal pl-5 text-[0.87rem] leading-relaxed text-gray-700">{children}</ol>
  ),
};

async function renderPageToDataUrl(pdfDoc: any, pageNumber: number): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  // Render op hoge resolutie -- de lightbox toont deze bijna schermvullend, dus de canvas
  // moet ruim boven de weergavegrootte zitten, ook op niet-retina schermen, om leesbaar te zijn.
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

// Renders a PDF attachment as a page-image gallery, client-side, via pdfjs-dist — so a
// volunteer sees the manual immediately instead of having to download it first. Only the
// first 3 pages render up front; the rest render on demand ("toon meer").
const PdfGallery: React.FC<{ url: string; filename: string; openDirectly?: boolean; onClose?: () => void }> = ({
  url,
  filename,
  openDirectly = false,
  onClose,
}) => {
  const { t } = useTranslation('dissco-cs');
  const [pages, setPages] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(openDirectly ? 0 : null);
  const [zoom, setZoom] = useState(1);
  const pdfDocRef = useRef<any>(null);
  const loadingRestRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
        console.error('[ProjectManualModal] PDF-galerij kon niet geladen worden', err);
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

  // Klikken op een pagina opent de leesbare lightbox — en start meteen het (achtergrond)
  // renderen van de resterende pagina's, zodat doorbladeren niet blokkeert op "toon meer".
  const openAt = (index: number) => {
    setOpenIndex(index);
    void loadRest();
  };

  // In openDirectly-modus is er geen thumbnail-grid om op terug te vallen -- de X sluit dan
  // meteen de hele handleiding i.p.v. enkel de lightbox.
  const closeLightbox = () => {
    if (openDirectly) {
      onClose?.();
      return;
    }
    setOpenIndex(null);
    setZoom(1);
  };

  // Normaal start het laden van de resterende pagina's pas bij een thumbnail-klik (openAt);
  // in openDirectly-modus is er geen klik, dus hier zodra het document geladen is.
  useEffect(() => {
    if (openDirectly && totalPages !== null) {
      void loadRest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDirectly, totalPages]);

  const goTo = (index: number) => {
    if (totalPages === null || index < 0 || index >= totalPages) {
      return;
    }
    setOpenIndex(index);
  };

  const zoomIn = () => setZoom(z => Math.min(3, Math.round((z + 0.5) * 100) / 100));
  const zoomOut = () => setZoom(z => Math.max(1, Math.round((z - 0.5) * 100) / 100));

  useEffect(() => {
    if (openIndex === null) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeLightbox();
      } else if (event.key === 'ArrowRight') {
        goTo(openIndex + 1);
      } else if (event.key === 'ArrowLeft') {
        goTo(openIndex - 1);
      } else if (event.key === '+' || event.key === '=') {
        zoomIn();
      } else if (event.key === '-') {
        zoomOut();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex, totalPages]);

  // Ctrl/Cmd+scroll om te zoomen -- gewoon scrollen blijft pannen door de vergrote pagina.
  // React's onWheel-prop kan preventDefault() niet betrouwbaar toepassen (passive listener),
  // dus een "echte" DOM-listener nodig om de browser's eigen ctrl+scroll-zoom te onderdrukken.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (openIndex === null || !el) {
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
  }, [openIndex]);

  if (failed) {
    return (
      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700">
        <span>{filename}</span>
        <a href={url} download={filename} className="font-semibold text-[var(--cs-primary)] hover:underline">
          {t('manual_pdf_download_original')}
        </a>
      </div>
    );
  }

  // In openDirectly-modus is er geen thumbnail-grid -- enkel de lightbox zelf teruggeven.
  const lightbox =
    openIndex !== null &&
    createPortal(
      // Via een portal recht in document.body gerenderd, zodat de fixed-lightbox niet
      // gevangen zit in de (getransformeerde) modal-kaart. Eén enkele scrollende
      // achtergrond-div is zowel het klik-om-te-sluiten-vlak als het paneel dat pant --
      // de kopbalk blijft zichtbaar via position:sticky (geen aparte fixed-elementen meer
      // die elkaars kliks konden onderscheppen).
      <div
        ref={scrollContainerRef}
        // top-[70px]: laat de vaste site-navbar (.cs-navbar, 70px hoog) zichtbaar boven de
        // lightbox i.p.v. hem te bedekken -- z-index hoeft dus enkel boven de basis-Modal
        // (z-50) te zitten, niet meer boven de navbar (z-200).
        className="fixed inset-x-0 bottom-0 top-[70px] z-[60] overflow-auto bg-black/90"
        onClick={closeLightbox}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-black/90 p-4 text-white"
          onClick={e => e.stopPropagation()}
        >
          <span className="text-sm font-semibold">
            {t('manual_pdf_page_counter', { page: openIndex + 1, total: totalPages ?? '…' })}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom <= 1}
              aria-label={t('manual_pdf_zoom_out') as string}
              className="flex h-9 w-9 items-center justify-center rounded-full border-none bg-white/10 text-lg font-bold text-white cursor-pointer hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
            >
              −
            </button>
            <span className="w-12 text-center text-xs font-semibold tabular-nums">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom >= 3}
              aria-label={t('manual_pdf_zoom_in') as string}
              className="flex h-9 w-9 items-center justify-center rounded-full border-none bg-white/10 text-lg font-bold text-white cursor-pointer hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
            >
              +
            </button>
            <button
              type="button"
              onClick={closeLightbox}
              aria-label={t('common_close') as string}
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border-none bg-white/10 text-white cursor-pointer hover:bg-white/20"
            >
              <LuX />
            </button>
          </div>
        </div>

        <div
          className="flex min-h-[calc(100%-4.5rem)] items-center justify-center p-4"
          onClick={e => e.stopPropagation()}
        >
          {pages[openIndex] ? (
            // maxWidth/maxHeight via inline style (niet Tailwind's w-/h-full) omdat een
            // inline style de globale Tailwind-reset "img{max-width:100%}" wél overschrijft
            // (zelfde property, hogere specificiteit) -- transform:scale() zoomt daarna
            // gewoon voorbij die grens, en de overflow-auto-ouder scrollt gewoon mee.
            <img
              src={pages[openIndex]}
              alt={t('manual_pdf_page_alt', { page: openIndex + 1 }) as string}
              style={{
                maxWidth: 'calc(100vw - 2rem)',
                maxHeight: 'calc(100vh - 6.5rem)',
                transform: `scale(${zoom})`,
                // transformOrigin 'top': schaalt naar beneden i.p.v. vanuit het midden --
                // anders puilt de bovenkant bij inzoomen uit boven de scrollcontainer en is
                // dat stuk onbereikbaar (scrollTop kan niet negatief worden).
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
            goTo(openIndex - 1);
          }}
          disabled={openIndex === 0}
          aria-label={t('manual_pdf_prev_page') as string}
          className="fixed left-4 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border-none bg-white/10 text-white cursor-pointer hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <LuArrowLeft />
        </button>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            goTo(openIndex + 1);
          }}
          disabled={totalPages === null || openIndex >= totalPages - 1}
          aria-label={t('manual_pdf_next_page') as string}
          className="fixed right-4 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border-none bg-white/10 text-white cursor-pointer hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <LuArrowRight />
        </button>
      </div>,
      document.body
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
        <a href={url} download={filename} className="text-xs font-semibold text-[var(--cs-primary)] hover:underline">
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
          className="mt-2 border-none bg-transparent p-0 text-xs font-semibold text-[var(--cs-primary)] cursor-pointer hover:underline"
        >
          {t('manual_pdf_show_more', { count: totalPages - pages.length })}
        </button>
      )}

      {lightbox}
    </div>
  );
};

export const ProjectManualModal: React.FC<ProjectManualModalProps> = ({
  projectSlug,
  projectLabel,
  open,
  onClose,
  onShown,
}) => {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data: manual } = useQuery(
    ['project-manual', projectSlug],
    () => projectManualsApi.getForProject(projectSlug),
    { enabled: open, retry: false, staleTime: 5 * 60 * 1000 }
  );

  const [openSectionIndex, setOpenSectionIndex] = useState(0);
  const shownRef = useRef(false);

  useEffect(() => {
    if (open && manual && !shownRef.current) {
      shownRef.current = true;
      onShown?.();
    }
    if (!open) {
      shownRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, manual]);

  const content = displayText(manual?.content, i18n.language, '');
  const sections = useMemo(() => splitIntoSections(content), [content]);

  const lang = (manual?.attachments?.[i18n.language as SitePageLang] ? i18n.language : 'nl') as SitePageLang;
  const attachment = manual?.attachments?.[lang];
  const attachmentUrl = attachment ? projectManualsApi.attachmentUrl(projectSlug, lang) : null;
  const isPdf = attachment?.mimeType === 'application/pdf';

  // Geen tekst, enkel een PDF -- de tussenpop voegt dan niets toe, dus meteen de galerij tonen.
  const directToGallery = isPdf && attachmentUrl !== null && content.trim().length === 0;

  const attachmentNode =
    attachment && attachmentUrl ? (
      isPdf ? (
        <PdfGallery url={attachmentUrl} filename={attachment.filename} />
      ) : (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700">
          <span>{attachment.filename}</span>
          <a href={attachmentUrl} download={attachment.filename} className="font-semibold text-[var(--cs-primary)] hover:underline">
            {t('manual_pdf_download_original')}
          </a>
        </div>
      )
    ) : null;

  // Beheerder kan {{attachment}} in een sectie plaatsen om de bijlage daar in te bedden; komt
  // het token nergens voor, dan blijft het oude gedrag (bijlage achteraan alle secties) gelden.
  const markerUsed = attachmentNode !== null && content.includes(ATTACHMENT_MARKER);

  if (!open || !manual) {
    return null;
  }

  // Enkel een PDF, geen tekst -- de tussenpop (titel + lege sectie-melding) voegt dan niets
  // toe, dus meteen de galerij op pagina 1 tonen i.p.v. eerst de Modal.
  if (directToGallery) {
    return attachment && attachmentUrl ? (
      <PdfGallery url={attachmentUrl} filename={attachment.filename} openDirectly onClose={onClose} />
    ) : null;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={t('manual_modal_eyebrow')}
      title={projectLabel || displayText(manual.title, i18n.language, '')}
      size="lg"
    >
      {sections.length === 0 ? (
        <p className="text-sm text-gray-500">{t('manual_modal_empty')}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sections.map((section, index) => {
            // Een koploze sectie (introtekst vóór de eerste "##") heeft geen klikbare header
            // om ze terug open te klappen, dus die moet altijd zichtbaar blijven.
            const isOpen = section.heading === null || sections.length === 1 || openSectionIndex === index;
            return (
              <div key={index} className="overflow-hidden rounded-lg border border-gray-200">
                {section.heading && (
                  <button
                    type="button"
                    onClick={() => setOpenSectionIndex(isOpen ? -1 : index)}
                    className={`flex w-full items-center justify-between gap-2 border-none px-3.5 py-2.5 text-left text-sm font-semibold cursor-pointer ${
                      isOpen ? 'bg-[var(--cs-primary)] text-white' : 'bg-gray-50 text-gray-800'
                    }`}
                  >
                    <span>{section.heading}</span>
                    <LuChevronDown className={`flex-shrink-0 transition-transform ${isOpen ? '-rotate-180' : ''}`} />
                  </button>
                )}
                {isOpen && (
                  <div className="px-4 py-3.5">
                    {attachmentNode && section.body.includes(ATTACHMENT_MARKER) ? (
                      (() => {
                        const [before, after] = splitBodyAroundMarker(section.body);
                        return (
                          <>
                            {before.trim() && <ReactMarkdown components={markdownComponents}>{before}</ReactMarkdown>}
                            {attachmentNode}
                            {after.trim() && <ReactMarkdown components={markdownComponents}>{after}</ReactMarkdown>}
                          </>
                        );
                      })()
                    ) : (
                      <ReactMarkdown components={markdownComponents}>{section.body}</ReactMarkdown>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {attachmentNode && !markerUsed && attachmentNode}
    </Modal>
  );
};
