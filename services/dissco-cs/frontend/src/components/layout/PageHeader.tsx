import React from 'react';
import { LuArrowLeft } from 'react-icons/lu';
import { HrefLink } from '../../utility/href-link';
import { useReturnState } from '../../hooks/use-return-link';
import { StatBannerItem, StatItems } from '../ui/StatBanner';

// The top of every page (style guide, "Hoofdingen en cijfers"):
// - split-banner: full-width teal panel with title, intro, buttons and numbers, the page's image on the right
// - compact: a low teal band without an image, for working pages (forum, dashboard, help, ...)
// - plain: a teal title on the page itself, for login and site management
// Every variant can start with a link back to the overview the page belongs to (`back`).
type HeaderBack = { href: string; label: string };

interface SplitBannerProps {
  variant: 'split-banner';
  title: React.ReactNode;
  back?: HeaderBack;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  stats?: StatBannerItem[];
  // Shown below the numbers, e.g. a progress bar.
  children?: React.ReactNode;
  // The right half: HeaderImage, HeaderLogo or HeaderMosaic. Without it the half stays light teal.
  aside?: React.ReactNode;
  // The teal runs on behind the right half, for a cut-out object that does not fill it (Home):
  // no hard edge between the dark text panel and a light image panel.
  continuous?: boolean;
}

interface CompactProps {
  variant: 'compact';
  title: React.ReactNode;
  back?: HeaderBack;
  lead?: React.ReactNode;
  stats?: StatBannerItem[];
  actions?: React.ReactNode;
}

interface PlainProps {
  variant: 'plain';
  title: React.ReactNode;
  lead?: React.ReactNode;
  back?: HeaderBack;
  actions?: React.ReactNode;
}

export type PageHeaderProps = SplitBannerProps | CompactProps | PlainProps;

export function PageHeader(props: PageHeaderProps) {
  if (props.variant === 'split-banner') {
    return <SplitBanner {...props} />;
  }
  if (props.variant === 'compact') {
    return <CompactBand {...props} />;
  }
  return <PlainTitle {...props} />;
}

function HeaderStats({ stats }: { stats: StatBannerItem[] }) {
  return (
    <div className="flex flex-wrap items-stretch gap-7 max-[600px]:gap-5">
      <StatItems stats={stats} />
    </div>
  );
}

function HeaderBackLink({ back, onDark }: { back: HeaderBack; onDark: boolean }) {
  return (
    <HrefLink
      href={back.href}
      className={`self-start inline-flex items-center gap-1 no-underline font-medium hover:underline ${onDark ? 'text-sm text-white/85 hover:text-white' : 'text-cs-primary mb-4'}`}
    >
      <LuArrowLeft aria-hidden="true" /> {back.label}
    </HrefLink>
  );
}

const BAND_GRADIENT = 'bg-gradient-to-b from-cs-accent via-cs-primary via-60% to-cs-dark';

function SplitBanner({ title, back, lead, actions, stats, children, aside, continuous = false }: SplitBannerProps) {
  return (
    // Only Home fills a tall header (title, intro and numbers next to the cut-out object); on the
    // other pages, often a title and one sentence, 400px left an empty teal panel.
    <header className={`grid grid-cols-1 md:grid-cols-2 ${continuous ? `md:min-h-[400px] ${BAND_GRADIENT}` : 'md:min-h-[300px]'}`}>
      <div className={`cs-header-start pr-10 max-md:pr-5 py-11 flex flex-col justify-center gap-4 text-white ${continuous ? '' : BAND_GRADIENT}`}>
        {back && <HeaderBackLink back={back} onDark />}
        <h1 className="text-[2.3rem] max-[600px]:text-[1.9rem] font-semibold leading-[1.1] m-0 text-white">{title}</h1>
        {lead && <div className="text-[1.05rem] text-white/85 max-w-[56ch] m-0">{lead}</div>}
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        {stats && stats.length > 0 && (
          <div className="pt-4 border-t border-white/20">
            <HeaderStats stats={stats} />
          </div>
        )}
        {children}
      </div>
      {/* A white seam frames the image against the teal panel; not on a continuous banner, where the
          teal runs on behind a cut-out object. */}
      <div
        className={`relative min-w-0 overflow-hidden min-h-[220px] ${
          continuous ? '' : 'bg-cs-primary/10 border-white max-md:border-t-[3px] md:border-l-[3px]'
        }`}
      >
        {aside}
      </div>
    </header>
  );
}

function CompactBand({ title, back, lead, stats, actions }: CompactProps) {
  return (
    <header className="bg-gradient-to-r from-cs-primary to-cs-accent text-white">
      <div className="cs-container cs-container--wide py-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 flex flex-col">
          {back && <HeaderBackLink back={back} onDark />}
          <h1 className="text-[1.9rem] font-semibold leading-tight m-0 text-white">{title}</h1>
          {lead && <div className="mt-1 text-white/85">{lead}</div>}
        </div>
        {stats && stats.length > 0 && <HeaderStats stats={stats} />}
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </header>
  );
}

function PlainTitle({ title, lead, back, actions }: PlainProps) {
  return (
    <header className="mb-8">
      {back && <HeaderBackLink back={back} onDark={false} />}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl text-cs-primary m-0">{title}</h1>
        {actions}
      </div>
      {lead && <div className="text-lg text-gray-600 mt-3">{lead}</div>}
    </header>
  );
}

// ---- the right half of a split-banner ----

/**
 * A photo filling the right half ('cover'), or a cut-out object without a background of its own
 * ('cutout', on a continuous split-banner), with its credit in the corner.
 */
export function HeaderImage({ src, credit, fit = 'cover' }: { src: string; credit?: string; fit?: 'cover' | 'cutout' }) {
  const placement = fit === 'cover' ? 'bg-cover bg-center' : 'bg-no-repeat bg-[length:auto_135%] bg-[position:right_-40px_center]';
  return (
    <>
      <div className={`absolute inset-0 ${placement}`} style={{ backgroundImage: `url(${src})` }} />
      {credit && (
        <span className={`absolute right-2.5 bottom-1.5 text-[0.7rem] italic text-white/80`}>
          {credit}
        </span>
      )}
    </>
  );
}

/** An institution's logo on white, closed off by a teal line. */
export function HeaderLogo({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="absolute inset-0 bg-white grid place-items-center p-10 border-b-[3px] border-cs-primary">
      <img src={src} alt={alt} className="max-h-40 max-w-full object-contain" />
    </div>
  );
}

export interface HeaderMosaicItem {
  href: string;
  label: string;
  image?: string;
}

// With fewer pictures the mosaic looks empty, so the half then stays plain light teal.
const MIN_MOSAIC_ITEMS = 3;

/**
 * Up to five pictures, each linking to its page; the first one is twice as large. 'cover': photos
 * filling their tile, with the label on them (projects). 'logo': logos shown whole on white, the
 * label only as the link's name (institutions); in grey, in colour on hover, so the logos' clashing
 * colours do not compete with the cards below, which show them in colour.
 */
export function HeaderMosaic({ items, fit = 'cover' }: { items: HeaderMosaicItem[]; fit?: 'cover' | 'logo' }) {
  const returnState = useReturnState();
  const withImage = items.filter(item => item.image).slice(0, 5);
  if (withImage.length < MIN_MOSAIC_ITEMS) {
    return null;
  }
  const isLogo = fit === 'logo';
  return (
    // The seams match the white one beside the teal panel; the logos sit on white tiles, so there a
    // light grey seam keeps the tiles apart.
    <div className={`absolute inset-0 grid grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-[3px] ${isLogo ? 'bg-gray-200' : 'bg-white'}`}>
      {withImage.map((item, i) => (
        <HrefLink
          key={item.href}
          href={item.href}
          state={returnState}
          title={isLogo ? item.label : undefined}
          aria-label={isLogo ? item.label : undefined}
          className={`group relative block overflow-hidden text-white no-underline focus-visible:outline focus-visible:outline-[3px] focus-visible:-outline-offset-[3px] focus-visible:outline-cs-accent ${isLogo ? 'bg-white' : ''} ${i === 0 ? 'row-span-2' : ''}`}
        >
          <div
            className={`absolute bg-center bg-no-repeat transition-[transform,filter,opacity] duration-300 group-hover:scale-[1.04] ${
              isLogo
                ? `bg-contain grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 group-focus-visible:grayscale-0 group-focus-visible:opacity-100 ${i === 0 ? 'inset-[18%]' : 'inset-[14%]'}`
                : 'inset-0 bg-cover'
            }`}
            style={{ backgroundImage: `url(${item.image})` }}
          />
          {!isLogo && (
            <span className="absolute inset-x-0 bottom-0 px-2.5 pt-[18px] pb-2 text-[0.74rem] font-semibold bg-gradient-to-b from-transparent to-black/60">
              {item.label}
            </span>
          )}
        </HrefLink>
      ))}
    </div>
  );
}
