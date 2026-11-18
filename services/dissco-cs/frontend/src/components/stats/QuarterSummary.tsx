import { useTranslation } from 'react-i18next';
import { LuAward } from 'react-icons/lu';
import { HONOUR_BOARD_DEFAULT_THRESHOLD } from '@dissco-cs/shared-types';
import { siteLangText } from '../../utility/site-lang-text';
import { HonourBoardQuarter } from '../../hooks/use-site-honour-board';
import { eyebrowClass } from '../ui/text-styles';
import { NumberedSteps } from '../ui/NumberedSteps';
import { quarterLabel } from './honour-board-timeline';
import { IconCircle } from './IconCircle';

const THRESHOLD_STEP = { title: 'honour_board_step_threshold_title', text: 'honour_board_step_threshold_text' } as const;
// With a thank-you a jury chooses from the pool; as recognition only, being in the pool is the point.
const STEPS = {
  prize: [
    THRESHOLD_STEP,
    { title: 'honour_board_step_selection_title', text: 'honour_board_step_selection_text' },
    { title: 'honour_board_step_thanks_title', text: 'honour_board_step_thanks_text' },
  ],
  recognition: [
    THRESHOLD_STEP,
    { title: 'honour_board_step_named_title', text: 'honour_board_step_named_text' },
    { title: 'honour_board_step_again_title', text: 'honour_board_step_again_text' },
  ],
} as const;

// For the running quarter, how taking part works in three steps; for a past quarter, one line on
// how it ended and, with a thank-you, its winner. The dates follow from the quarter itself.
export function QuarterSummary({ quarter }: { quarter: HonourBoardQuarter }) {
  const { t, i18n } = useTranslation('dissco-cs');
  const dayMonth = (date: Date) => date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' });
  const threshold = quarter.data?.threshold ?? HONOUR_BOARD_DEFAULT_THRESHOLD;

  if (quarter.kind === 'current') {
    return (
      <div className="flex flex-col gap-3">
        <h3 className={eyebrowClass}>{t('honour_board_how_title')}</h3>
        <NumberedSteps
          compact
          steps={STEPS[quarter.data?.mode === 'recognition' ? 'recognition' : 'prize'].map(step => ({
            title: t(step.title),
            text: t(step.text, { start: dayMonth(quarter.start), end: dayMonth(quarter.lastDay), threshold }),
          }))}
        />
      </div>
    );
  }

  const text = quarter.pending
    ? t('common_loading')
    : t('honour_board_summary_past', { end: dayMonth(quarter.lastDay), count: quarter.data?.pool.length ?? 0, threshold });
  const winner = quarter.data?.winner;
  const prize = quarter.data?.prize;

  return (
    <div className="flex flex-col gap-2">
      <h3 className={eyebrowClass}>
        {quarterLabel(quarter.key)}
      </h3>
      <p className="m-0 text-[0.92rem] text-gray-700">{text}</p>
      {winner ? (
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 items-center bg-award-50 rounded-[4px] px-3.5 py-2.5 text-[0.9rem]">
          <IconCircle tone="winner" small>
            <LuAward aria-hidden="true" />
          </IconCircle>
          <div className="min-w-0">
            <b className="text-gray-900">
              {t('honour_board_winner', { name: winner.userUrn === quarter.data?.you?.userUrn ? t('honour_board_you') : winner.name })}
            </b>
            {prize && (
              <span className="block text-[0.8rem] text-gray-600">
                {t('honour_board_winner_prize', { prize: siteLangText(prize.title, i18n.language, '') })}
              </span>
            )}
          </div>
        </div>
      ) : (
        quarter.data?.mode === 'prize' && <p className="m-0 text-[0.92rem] text-gray-700">{t('honour_board_winner_pending_text')}</p>
      )}
    </div>
  );
}
