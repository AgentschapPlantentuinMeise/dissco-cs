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
