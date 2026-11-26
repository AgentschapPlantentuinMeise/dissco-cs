import { HonourBoardQuarterKey, HonourBoardSettingsDto } from '@dissco-cs/shared-types';
import { SiteSettingsRepository, toHonourBoardSettingsDto } from '../repositories/site-settings.repository.js';
import { HonourBoardQuartersRepository, toHonourBoardQuarterRecord } from '../repositories/honour-board-quarters.repository.js';
import { HonourBoardRepository } from './honour-board.repository.js';
import { QuarterCount, QuarterRecord } from '../logic/honour-board.logic.js';

export interface LoadedQuarter {
  settings: HonourBoardSettingsDto;
  record: QuarterRecord | null;
  counts: QuarterCount[];
  // The counts are being recalculated in the background: a cache-only read soon may differ.
  refreshing: boolean;
}

// Everything that decides a quarter's pool, for the public band and for management alike. The site's
// mode and threshold and what a site admin stored for the quarter are two lookups on a primary key in
// our own database, so they are read fresh every time. Only the counts from Madoc are cached; in the
// mode 'off' Madoc is not asked at all.
export class HonourBoardQuarterLoader {
  constructor(
    private readonly siteSettingsRepository: SiteSettingsRepository,
    private readonly quartersRepository: HonourBoardQuartersRepository,
    private readonly honourBoardRepository: HonourBoardRepository
  ) {}

  // cachedOnly: the counts from the cache when there are any, without starting a recalculation.
  async load(siteId: number, quarter: HonourBoardQuarterKey, cachedOnly = false): Promise<LoadedQuarter> {
    const [settingsRow, quarterRow] = await Promise.all([
      this.siteSettingsRepository.get(siteId),
      this.quartersRepository.get(siteId, quarter),
    ]);
    const settings = toHonourBoardSettingsDto(settingsRow);
    const counts =
      settings.mode === 'off'
        ? []
        : ((cachedOnly ? this.honourBoardRepository.peekCounts(siteId, quarter) : null) ??
          (await this.honourBoardRepository.getCounts(siteId, quarter)));
    return {
      settings,
      record: toHonourBoardQuarterRecord(quarterRow),
      counts,
      refreshing: settings.mode !== 'off' && this.honourBoardRepository.isRefreshing(siteId, quarter),
    };
  }
}
