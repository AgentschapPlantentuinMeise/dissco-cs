import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HonourBoardMode, HonourBoardPoolEntryDto, HonourBoardQuarterKey, isQuarterOver } from '@dissco-cs/shared-types';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Disclosure } from '../../../components/ui/Disclosure';
import { SectionLoadError } from '../../../components/layout/SectionLoadError';
import { eyebrowClass } from '../../../components/ui/text-styles';
import { failedToLoad } from '../../../api/query-state';
import { quarterLabel } from '../../../components/stats/honour-board-timeline';
import { PrizeForm } from './PrizeForm';
import { useQuarterManagement } from './use-honour-board-management';
import { LoadingText } from '../../../components/layout/LoadingText';
import { EmptyText } from '../../../components/layout/EmptyText';
import { formatDay } from '../../../utility/format-date';

// One quarter in management, closed by default: its thank-you (mode 'prize') and its pool, from
// which the jury chooses the winner once the quarter is over.
export function QuarterManagement({ quarter, mode }: { quarter: HonourBoardQuarterKey; mode: HonourBoardMode }) {
  const { t, i18n } = useTranslation('dissco-cs');
  const { quarterQuery, savePrize, deletePrize, chooseWinner } = useQuarterManagement(quarter);
  const [candidate, setCandidate] = useState<HonourBoardPoolEntryDto | null>(null);
  const data = quarterQuery.data;
  const ended = isQuarterOver(quarter, new Date());
  const withPrize = mode === 'prize';
  const label = quarterLabel(quarter);

  const title = !data
    ? label
    : !ended
      ? t('sm_honour_board_quarter_running', { quarter: label, count: data.pool.length })
      : withPrize && data.winner
        ? t('sm_honour_board_quarter_winner', { quarter: label, count: data.pool.length, name: data.winner.name })
        : t('sm_honour_board_quarter_ended', { quarter: label, count: data.pool.length });

  return (
    <Disclosure title={title}>
      {failedToLoad(quarterQuery) ? (
        <SectionLoadError />
      ) : !data ? (
        <LoadingText />
      ) : (
        <div className="flex flex-col gap-6">
          {withPrize && (
            <section className="flex flex-col gap-2.5">
              <h3 className={eyebrowClass}>{t('sm_honour_board_prize')}</h3>
              <PrizeForm
                saved={data.prize}
                onSave={(prize, onSaved) => savePrize.mutate(prize, { onSuccess: onSaved })}
                saving={savePrize.isPending}
                isSaved={savePrize.isSuccess}
                onDelete={() => deletePrize.mutate()}
                deleting={deletePrize.isPending}
              />
            </section>
          )}

          <section className="flex flex-col gap-2.5">
            <h3 className={eyebrowClass}>{t('sm_honour_board_pool', { threshold: data.threshold })}</h3>
            {withPrize && data.winnerChosenAt && (
              <p className="m-0 text-sm text-gray-600">
                {t('sm_honour_board_pool_frozen', { date: formatDay(data.winnerChosenAt, i18n.language) })}
              </p>
            )}
            {data.pool.length === 0 ? (
              <EmptyText>{t('sm_honour_board_pool_empty')}</EmptyText>
            ) : (
              <ul className="list-none m-0 p-0 flex flex-col divide-y divide-gray-100">
                {data.pool.map(entry => (
                  <li key={entry.userUrn} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="font-semibold text-gray-900">{entry.name}</span>{' '}
                      <span className="text-sm text-gray-600">{t('sm_honour_board_pool_tasks', { count: entry.count })}</span>
                    </span>
                    {withPrize && entry.userUrn === data.winner?.userUrn ? (
                      <span className="text-sm font-semibold text-cs-secondary">{t('sm_honour_board_winner')}</span>
                    ) : (
                      withPrize &&
                      ended && (
                        <Button variant="secondary" size="sm" onClick={() => setCandidate(entry)}>
                          {t('sm_honour_board_choose_winner')}
                        </Button>
                      )
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {candidate && (
        <ConfirmDialog
          tone="affirm"
          title={t('sm_honour_board_choose_winner')}
          message={t('sm_honour_board_choose_winner_confirm', { name: candidate.name, quarter: label })}
          confirmLabel={t('sm_honour_board_choose_winner')}
          cancelLabel={t('common_cancel')}
          onConfirm={() => {
            chooseWinner.mutate(candidate.userUrn);
            setCandidate(null);
          }}
          onCancel={() => setCandidate(null)}
        />
      )}
    </Disclosure>
  );
}
