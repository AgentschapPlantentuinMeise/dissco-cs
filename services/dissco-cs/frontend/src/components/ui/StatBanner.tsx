import React from 'react';

export type StatBannerItem = {
  value: React.ReactNode;
  label: string;
  note?: string;
};

// White on a teal header or StatBanner, or teal on a light page section.
const ITEM_TONES = {
  onDark: { divider: 'bg-white/25', value: '', label: 'text-[#e3f7f4]', note: 'text-[#bcebe6]' },
  onLight: { divider: 'bg-gray-300', value: 'text-cs-primary', label: 'text-gray-600', note: 'text-gray-500' },
};

// The numbers themselves (big value, small uppercase label, hairline between them): inside a
// StatBanner, a PageHeader band, or a light page section. The caller provides the flex row.
export function StatItems({ stats, tone = 'onDark' }: { stats: StatBannerItem[]; tone?: keyof typeof ITEM_TONES }) {
  const colors = ITEM_TONES[tone];
  return (
    <>
      {stats.map((stat, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div className={`w-px self-stretch ${colors.divider}`} />}
          <div className="flex flex-col">
            <span className={`text-[1.9rem] font-bold leading-none tabular-nums ${colors.value}`}>{stat.value}</span>
            <span className={`text-[0.68rem] uppercase tracking-[0.05em] mt-1.5 ${colors.label}`}>{stat.label}</span>
            {stat.note && <span className={`text-[0.62rem] italic mt-0.5 ${colors.note}`}>{stat.note}</span>}
          </div>
        </React.Fragment>
      ))}
    </>
  );
}

/**
 * Stats strip with a teal gradient — the "signature" look for stats pages (volunteer dashboard,
 * institution detail, honour board). Sharp corners, no shadow, with a dark accent line at the
 * bottom instead of a shadow as the shape language.
 *
 * `trailing` renders after the last stat: right-aligned by default (e.g. a badge), or as its own
 * full-width row below the stats with a top border when `trailingDivider` is set (e.g. running
 * text that doesn't fit as an inline column).
 */
export function StatBanner({ stats, eyebrow, trailing, trailingDivider = false, className = '' }: {
  stats: StatBannerItem[];
  eyebrow?: React.ReactNode;
  trailing?: React.ReactNode;
  trailingDivider?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[4px] border-b-[3px] border-b-cs-dark bg-gradient-to-r from-cs-primary to-cs-accent text-white px-8 py-6 max-[600px]:px-6 ${className}`}
    >
      {eyebrow && (
        <div className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#e3f7f4] opacity-80 mb-3">
          {eyebrow}
        </div>
      )}
      <div className="flex items-center gap-9 flex-wrap max-[600px]:gap-6">
        <StatItems stats={stats} />
        {trailing && !trailingDivider && (
          <div className="ml-auto max-[600px]:ml-0">{trailing}</div>
        )}
      </div>
      {trailing && trailingDivider && (
        <div className="mt-4 pt-3 border-t border-white/15">{trailing}</div>
      )}
    </div>
  );
}
