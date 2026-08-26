import React from 'react';

export type StatBannerItem = {
  value: React.ReactNode;
  label: string;
  note?: string;
};

const Divider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`w-px self-stretch bg-white/25 ${className}`} />
);

/**
 * Stats strip with a teal gradient — the "signature" look for stats pages (volunteer dashboard,
 * institution detail, honour board). Sharp corners, no shadow, with a dark accent line at the
 * bottom instead of a shadow as the shape language.
 *
 * `trailing` renders after the last stat: right-aligned by default (e.g. a badge), or as its own
 * full-width row below the stats with a top border when `trailingDivider` is set (e.g. running
 * text that doesn't fit as an inline column).
 */
export const StatBanner: React.FC<{
  stats: StatBannerItem[];
  eyebrow?: React.ReactNode;
  trailing?: React.ReactNode;
  trailingDivider?: boolean;
  className?: string;
}> = ({ stats, eyebrow, trailing, trailingDivider = false, className = '' }) => (
  <div
    className={`rounded-[4px] border-b-[3px] border-b-[var(--cs-dark)] bg-gradient-to-r from-[var(--cs-primary)] to-[var(--cs-accent)] text-white px-8 py-6 max-[600px]:px-6 ${className}`}
  >
    {eyebrow && (
      <div className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#e3f7f4] opacity-80 mb-3">
        {eyebrow}
      </div>
    )}
    <div className="flex items-center gap-9 flex-wrap max-[600px]:gap-6">
      {stats.map((stat, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Divider />}
          <div className="flex flex-col">
            <span className="text-[1.9rem] font-bold leading-none tabular-nums">{stat.value}</span>
            <span className="text-[0.68rem] uppercase tracking-[0.05em] text-[#e3f7f4] mt-1.5">{stat.label}</span>
            {stat.note && <span className="text-[0.62rem] text-[#bcebe6] italic mt-0.5">{stat.note}</span>}
          </div>
        </React.Fragment>
      ))}
      {trailing && !trailingDivider && (
        <div className="ml-auto max-[600px]:ml-0">{trailing}</div>
      )}
    </div>
    {trailing && trailingDivider && (
      <div className="mt-4 pt-3 border-t border-white/15">{trailing}</div>
    )}
  </div>
);
