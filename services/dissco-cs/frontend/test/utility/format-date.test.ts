import { describe, expect, it } from 'vitest';

import { formatDate, formatDay, formatDayMonth, formatTimeAgo } from '../../src/utility/format-date';

describe('formatDate', () => {
  it('shows date and time without seconds, also for milliseconds from Madoc', () => {
    const moment = new Date(2026, 10, 18, 14, 3, 27);
    expect(formatDate(moment.toISOString(), 'en-GB')).toBe('18/11/2026, 14:03');
    expect(formatDate(moment.getTime(), 'en-GB')).toBe('18/11/2026, 14:03');
  });
});

describe('formatDay and formatDayMonth', () => {
  it('shows only the date, or day and month', () => {
    const moment = new Date(2026, 10, 18, 14, 3);
    expect(formatDay(moment, 'en-GB')).toBe('18/11/2026');
    expect(formatDayMonth(moment, 'nl', 'long')).toBe('18 november');
  });
});

const now = new Date('2026-10-20T12:00:00Z');

describe('formatTimeAgo', () => {
  it('counts minutes within the hour, at least one', () => {
    expect(formatTimeAgo('2026-10-20T11:59:50Z', 'en', now)).toBe('1 min. ago');
    expect(formatTimeAgo('2026-10-20T11:15:00Z', 'en', now)).toBe('45 min. ago');
  });

  it('counts hours within the day', () => {
    expect(formatTimeAgo('2026-10-20T09:00:00Z', 'en', now)).toBe('3 hr. ago');
  });

  it('says yesterday for one day ago', () => {
    expect(formatTimeAgo('2026-10-19T12:00:00Z', 'en', now)).toBe('yesterday');
  });

  it('gives the plain date from a week on', () => {
    expect(formatTimeAgo('2026-10-01T12:00:00Z', 'en-GB', now)).toBe('01/10/2026');
  });
});
