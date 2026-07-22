import React from 'react';

export type StatBannerItem = {
  value: React.ReactNode;
  label: string;
  note?: string;
};

const Divider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`w-px self-stretch bg-white/20 ${className}`} />
);

/**
 * Gevulde hero-banner met kerncijfers — de "signatuur" voor statistiek-pagina's
 * (vrijwilligers-dashboard en instituutdetail). Deelt de vorm-taal van de
 * projectdetail-hero: afgerond, zachte schaduw, teal-verloop.
 *
 * `trailing` staat na de laatste stat: standaard rechts uitgelijnd (bv. een badge),
 * of inline met een scheidingslijn ervoor als `trailingDivider` gezet is (bv. een
 * lopende tekst die als extra kolom meetelt).
 */
export const StatBanner: React.FC<{
  stats: StatBannerItem[];
  trailing?: React.ReactNode;
  trailingDivider?: boolean;
  className?: string;
}> = ({ stats, trailing, trailingDivider = false, className = '' }) => (
  <div
    className={`rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.1)] bg-gradient-to-r from-[var(--cs-primary)] to-[var(--cs-accent)] text-white px-8 py-6 flex items-center gap-9 flex-wrap max-[600px]:px-6 max-[600px]:gap-6 ${className}`}
  >
    {stats.map((stat, i) => (
      <React.Fragment key={i}>
        {i > 0 && <Divider />}
        <div className="flex flex-col">
          <span className="text-[1.9rem] font-bold leading-none tabular-nums">{stat.value}</span>
          <span className="text-[0.68rem] uppercase tracking-[0.05em] text-[#bcd8d3] mt-1.5">{stat.label}</span>
          {stat.note && <span className="text-[0.62rem] text-[#8fb5af] italic mt-0.5">{stat.note}</span>}
        </div>
      </React.Fragment>
    ))}
    {trailing &&
      (trailingDivider ? (
        <>
          <Divider className="max-[600px]:hidden" />
          {trailing}
        </>
      ) : (
        <div className="ml-auto max-[600px]:ml-0">{trailing}</div>
      ))}
  </div>
);
