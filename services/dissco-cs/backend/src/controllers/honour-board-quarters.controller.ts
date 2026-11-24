import { Hono } from 'hono';
import { honourBoardPrizeSchema, honourBoardWinnerSchema, isQuarterOver } from '@dissco-cs/shared-types';
import { HonourBoardQuartersRepository } from '../repositories/honour-board-quarters.repository.js';
import { HonourBoardQuarterLoader } from '../madoc-db/honour-board.loader.js';
import { canChooseWinner, quarterPool, quarterToAdminDto } from '../logic/honour-board.logic.js';
import { requireSiteAdmin } from '../auth/auth.js';
import { validateJson } from '../infrastructure/validate-json.js';
import { honourBoardQuarter, validateParams } from '../infrastructure/validate-params.js';

// Site admin only: a quarter's thank-you and its winner, chosen by a jury from the pool.
export function honourBoardQuartersController(
  quartersRepository: HonourBoardQuartersRepository,
  quarterLoader: HonourBoardQuarterLoader
): Hono {
  const app = new Hono();

  app.get('/:quarter', validateParams({ quarter: honourBoardQuarter }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { quarter } = c.req.valid('param');
    const { settings, record, counts } = await quarterLoader.load(identity.siteId, quarter);
    return c.json(quarterToAdminDto(quarter, counts, settings, record));
  });

  app.put('/:quarter/prize', validateParams({ quarter: honourBoardQuarter }), validateJson(honourBoardPrizeSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    await quartersRepository.setPrize(identity.siteId, identity.userId, c.req.valid('param').quarter, c.req.valid('json'));
    return c.body(null, 204);
  });

  app.delete('/:quarter/prize', validateParams({ quarter: honourBoardQuarter }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    await quartersRepository.clearPrize(identity.siteId, identity.userId, c.req.valid('param').quarter);
    return c.body(null, 204);
  });

  // The pool is frozen with the choice, so a later rejection or a new threshold does not change who
  // the jury chose from. Choosing again corrects a mistake, from that same frozen pool.
  app.put('/:quarter/winner', validateParams({ quarter: honourBoardQuarter }), validateJson(honourBoardWinnerSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { quarter } = c.req.valid('param');
    const { userUrn } = c.req.valid('json');
    const { settings, record, counts } = await quarterLoader.load(identity.siteId, quarter);
    const { pool, threshold } = quarterPool(counts, settings, record);
    if (!canChooseWinner(settings.mode, isQuarterOver(quarter, new Date()), pool, userUrn)) {
      return c.json({ error: 'Only someone from the pool of an ended quarter, in the mode prize' }, 409);
    }

    await quartersRepository.setWinner(identity.siteId, identity.userId, quarter, { userUrn, pool, threshold });
    return c.body(null, 204);
  });

  return app;
}
