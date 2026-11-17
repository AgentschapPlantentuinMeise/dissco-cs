import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuAward } from 'react-icons/lu';
import { siteLangText } from '../../utility/site-lang-text';
import { HONOUR_BOARD_DEFAULT_THRESHOLD } from '@dissco-cs/shared-types';
import { useCurrentUser } from '../../hooks/use-current-user';
import { HonourBoardQuarter } from '../../hooks/use-site-honour-board';
import { HrefLink } from '../../utility/href-link';
import { formatNumber } from '../../utility/format-number';
import { currentLocation, withQuery } from '../../api/url';
import { YourProgress } from './YourProgress';
import { QuarterSummary } from './QuarterSummary';
import { IconCircle } from './IconCircle';
import { progressToThreshold, quarterLabel } from './honour-board-timeline';

const EYEBROW = 'text-[0.68rem] font-semibold uppercase tracking-[0.05em] text-gray-500';

// The one panel below the timeline, for the selected quarter: on the left what concerns you (your
// progress, how the quarter went for you, or an invitation to take part), on the right how taking
// part works or how the quarter ended.
export function QuarterPanel({ quarter }: { quarter: HonourBoardQuarter }) {
  const { t, i18n } = useTranslation('dissco-cs');
  const user = useCurrentUser();
  const format = (n: number) => formatNumber(n, i18n.language);
  const you = quarter.data?.you;
  const threshold = quarter.data?.threshold ?? HONOUR_BOARD_DEFAULT_THRESHOLD;

  let yours: React.ReactNode;
  if (!user) {
    yours = (
      <>
        <p className="m-0 text-[0.95rem] font-semibold text-gray-900">
          {t(quarter.data?.mode === 'recognition' ? 'honour_board_how_lead_recognition' : 'honour_board_how_lead')}
        </p>
        <HrefLink href={withQuery('/login', { redirect: currentLocation() })} className="text-[0.88rem] text-cs-primary font-semibold">
          {t('honour_board_login')}
        </HrefLink>
      </>
    );
  } else if (!you) {
    yours = <p className="m-0 text-sm text-gray-500">{t('card_loading')}</p>;
  } else if (quarter.kind === 'current') {
    yours = <YourProgress count={you.count} threshold={threshold} daysLeft={quarter.daysLeft} />;
  } else if (quarter.data?.winner?.userUrn === you.userUrn) {
    const prize = quarter.data?.prize;
    yours = (
      <>
        <span className={EYEBROW}>{t('honour_board_you_past_label', { quarter: quarterLabel(quarter.key) })}</span>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3.5 items-center text-[0.92rem] text-gray-700">
          <IconCircle tone="winner">
            <LuAward aria-hidden="true" />
          </IconCircle>
          <p className="m-0">
            <b className="text-gray-900">{t('honour_board_you_won')}</b>{' '}
            {prize && t('honour_board_you_won_prize', { prize: siteLangText(prize.title, i18n.language, '') })}
          </p>
        </div>
      </>
    );
  } else {
    const { toGo } = progressToThreshold(you.count, threshold);
    yours = (
      <>
        <span className={EYEBROW}>{t('honour_board_you_past_label', { quarter: quarterLabel(quarter.key) })}</span>
        <p className="m-0 text-[0.92rem] text-gray-700">
          {you.count === 0
            ? t('honour_board_you_past_none')
            : toGo === 0
              ? t('honour_board_you_past_in', { count: format(you.count) })
              : t('honour_board_you_past_below', { count: format(you.count), toGo: format(toGo) })}
        </p>
      </>
    );
  }

  return (
    <div className="bg-white rounded-[4px] grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="min-w-0 px-6 py-5 flex flex-col justify-center gap-2.5 border-b lg:border-b-0 lg:border-r border-cs-primary/10">
        {yours}
      </div>
      <div className="min-w-0 px-6 py-5">
        <QuarterSummary quarter={quarter} />
      </div>
    </div>
  );
}
