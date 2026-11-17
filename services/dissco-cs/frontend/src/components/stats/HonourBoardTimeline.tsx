import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageSection } from '../layout/PageSection';
import { SectionLoadError } from '../layout/SectionLoadError';
import { HonourBoardQuarter } from '../../hooks/use-site-honour-board';
import { QuarterStrip } from './QuarterStrip';
import { QuarterPanel } from './QuarterPanel';
import { PoolNames } from './PoolNames';

/**
 * The honour board band at the bottom of a page: the running quarter and the three before it on one line, with everyone
 * in a quarter's pool as a bar above it. Below the line one panel for the selected quarter, and
 * the names in its pool. `board` comes from useSiteHonourBoard.
 */
export function HonourBoardTimeline({ board }: { board: HonourBoardQuarter[] }) {
  const { t } = useTranslation('dissco-cs');
  const [selected, setSelected] = useState(() => Math.max(0, board.findIndex(quarter => quarter.kind === 'current')));
  const quarter = board[selected];
  const current = board.find(entry => entry.kind === 'current');
  // The mode comes with the running quarter: without it there is no way to know whether the band
  // is switched off, so a failed load shows as a failed section rather than as no band at all.
  if (current?.failed) {
    return (
      <PageSection tone="tint" title={t('honour_board_title')}>
        <SectionLoadError />
      </PageSection>
    );
  }
  // Nothing is shown until the mode is known, so a band that is switched off does not flash up and disappear.
  const mode = current?.data?.mode;
  if (!mode || mode === 'off') {
    return null;
  }

  return (
    <PageSection
      tone="tint"
      title={t('honour_board_title')}
      intro={t(mode === 'prize' ? 'honour_board_intro' : 'honour_board_intro_recognition')}
    >
      <QuarterStrip board={board} selected={selected} onSelect={setSelected} />
      <QuarterPanel quarter={quarter} />
      {/* Keyed on the quarter, so the names close again when another quarter is chosen. */}
      <PoolNames key={quarter.key} quarter={quarter} />
    </PageSection>
  );
}
