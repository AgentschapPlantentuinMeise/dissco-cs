import React, { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Disclosure, DisclosureButton } from '@headlessui/react';
import { buttonClass } from '../ui/Button';

// The "About" block below a detail page's header: the text on reading width on the left, a narrow
// column with a teal margin line on the right (style guide, "Projectpagina", S2). The text is cut
// off at the height of that column (at least a few lines), so both end on the same line; "Read
// more" shows the rest, and only appears when something is cut off.
const PARAGRAPH_CLASS = 'm-0 whitespace-pre-line text-[1.02rem] leading-[1.65] text-gray-700';

// Without an aside the text stands alone on reading width, in full.
export function AboutColumns({ text, aside }: { text: string; aside?: React.ReactNode }) {
  if (!aside) {
    return <p className={`${PARAGRAPH_CLASS} max-w-[68ch]`}>{text}</p>;
  }
  if (!text) {
    return <AsideColumn>{aside}</AsideColumn>;
  }
  return (
    // Two equal halves: the section's container is centred, so the aside's margin line falls on
    // the middle of the screen, right under the seam between the header's text and image.
    <Disclosure as="div" className="grid md:grid-cols-2 gap-y-8">
      {({ open }) => <ClampedText text={text} open={open} aside={aside} />}
    </Disclosure>
  );
}

function ClampedText({ text, open, aside }: { text: string; open: boolean; aside: React.ReactNode }) {
  const { t } = useTranslation('dissco-cs');
  const clipRef = useRef<HTMLDivElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const [cutOff, setCutOff] = useState(false);
  const [textHeight, setTextHeight] = useState<number | null>(null);

  // Measured only while closed: open, nothing is clipped, and the button must stay to close it.
  // A ResizeObserver, because the height follows the aside column and the window width.
  useLayoutEffect(() => {
    const el = clipRef.current;
    if (!el || open) return;
    const measure = () => {
      setCutOff(el.scrollHeight > el.clientHeight + 1);
      setTextHeight(paragraphRef.current?.offsetHeight ?? null);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [text, open]);

  const paragraph = (
    <p ref={paragraphRef} className={PARAGRAPH_CLASS}>
      {text}
    </p>
  );

  return (
    <>
      <div className="flex flex-col gap-3 min-w-0 max-w-[68ch] md:pr-14">
        {open ? (
          paragraph
        ) : (
          // The text is taken out of the flow, so the row's height comes from the aside column
          // (or the minimum), and the text is cut off there; a mask fades out the last line. The
          // minimum shows a few lines of a long text, but never more than the text itself needs.
          <div className="relative flex-1" style={{ minHeight: textHeight === null ? '10.5rem' : `min(10.5rem, ${textHeight}px)` }}>
            <div
              ref={clipRef}
              className={`absolute inset-0 overflow-hidden ${cutOff ? '[mask-image:linear-gradient(to_bottom,black_75%,transparent)]' : ''}`}
            >
              {paragraph}
            </div>
          </div>
        )}
        {(cutOff || open) && (
          <DisclosureButton className={`${buttonClass({ variant: 'text', size: 'sm' })} self-start`}>
            {open ? t('common_read_less') : t('common_read_more')}
          </DisclosureButton>
        )}
      </div>
      <AsideColumn>{aside}</AsideColumn>
    </>
  );
}

function AsideColumn({ children }: { children: React.ReactNode }) {
  return <aside className="self-start border-l-[3px] border-cs-primary pl-[22px] flex flex-col gap-[18px]">{children}</aside>;
}
