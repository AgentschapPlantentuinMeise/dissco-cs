import { describe, expect, it } from 'vitest';

import { collectAllPages, Page } from '../../src/madoc-client/pagination.js';

// A fake list of `totalPages` pages with one item each (the page number), recording every call.
function fakeList(totalPages: number | undefined) {
  const calls: number[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const fetchPage = async (page: number): Promise<Page<number>> => {
    calls.push(page);
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise(resolve => setTimeout(resolve, 1));
    inFlight -= 1;
    return { items: [page], totalPages };
  };
  return { fetchPage, calls, maxInFlight: () => maxInFlight };
}

describe('collectAllPages', () => {
  it.each([undefined, 1])('fetches only page 1 when totalPages is %j', async totalPages => {
    const list = fakeList(totalPages);
    expect(await collectAllPages(list.fetchPage)).toEqual([1]);
    expect(list.calls).toEqual([1]);
  });

  // Regression: the IIIF collection picker started at page 0 (= page 1 for Madoc), so page 1 came
  // in twice and the last page never.
  it('fetches pages 1..totalPages exactly once, in order', async () => {
    const list = fakeList(3);
    expect(await collectAllPages(list.fetchPage, 6)).toEqual([1, 2, 3]);
    expect([...list.calls].sort()).toEqual([1, 2, 3]);
  });

  it('keeps page order when fetching concurrently', async () => {
    const list = fakeList(10);
    expect(await collectAllPages(list.fetchPage, 4)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it.each([1, 3, 6])('never has more than %i requests in flight', async concurrency => {
    const list = fakeList(20);
    await collectAllPages(list.fetchPage, concurrency);
    expect(list.calls).toHaveLength(20);
    expect(list.maxInFlight()).toBeLessThanOrEqual(concurrency);
  });

  it('rejects when a later page fails', async () => {
    const fetchPage = async (page: number): Promise<Page<number>> => {
      if (page === 2) {
        throw new Error('page 2 failed');
      }
      return { items: [page], totalPages: 3 };
    };
    await expect(collectAllPages(fetchPage)).rejects.toThrow('page 2 failed');
  });
});
