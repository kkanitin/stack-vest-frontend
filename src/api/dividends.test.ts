import { getDividendCalendar } from './dividends';
import type { DividendEvent } from './dividends';

afterEach(() => vi.unstubAllGlobals());

function rows(count: number): DividendEvent[] {
  return Array.from({ length: count }, (_, i) => ({ symbol: `S${i}` }) as DividendEvent);
}

function page(results: DividendEvent[], total?: number): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      results,
      code: 200,
      ...(total === undefined ? {} : { meta: { total, page: 1, size: 100, currentPageCount: results.length } }),
    }),
  } as unknown as Response;
}

/** Query params of the nth `fetch` call (the base only matters if API_BASE is relative). */
function paramsOf(fetchMock: ReturnType<typeof vi.fn>, call: number): URLSearchParams {
  return new URL(fetchMock.mock.calls[call][0] as string, 'http://x').searchParams;
}

const RANGE = { from: '2026-07-01', to: '2026-07-31' };

describe('getDividendCalendar', () => {
  it('requests the first page of the given range with the bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(page(rows(2), 2));
    vi.stubGlobal('fetch', fetchMock);

    const events = await getDividendCalendar('t', RANGE);

    expect(events).toHaveLength(2);
    const qs = paramsOf(fetchMock, 0);
    expect(qs.get('from')).toBe('2026-07-01');
    expect(qs.get('to')).toBe('2026-07-31');
    expect(qs.get('page')).toBe('1');
    expect(qs.get('size')).toBe('100');
    expect(fetchMock.mock.calls[0][1]).toEqual({ headers: { Authorization: 'Bearer t' } });
  });

  it('follows pages until it has collected meta.total rows', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(page(rows(100), 150))
      .mockResolvedValueOnce(page(rows(50), 150));
    vi.stubGlobal('fetch', fetchMock);

    const events = await getDividendCalendar('t', RANGE);

    expect(events).toHaveLength(150);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const qs = paramsOf(fetchMock, 1);
    expect(qs.get('page')).toBe('2');
    expect(qs.get('size')).toBe('100');
    expect(qs.get('from')).toBe('2026-07-01');
    expect(qs.get('to')).toBe('2026-07-31');
  });

  it('stops once meta.total is reached on a full page', async () => {
    const fetchMock = vi.fn().mockResolvedValue(page(rows(100), 100));
    vi.stubGlobal('fetch', fetchMock);

    const events = await getDividendCalendar('t', RANGE);

    expect(events).toHaveLength(100);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('requests exactly two full pages for a total of 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue(page(rows(100), 200));
    vi.stubGlobal('fetch', fetchMock);

    const events = await getDividendCalendar('t', RANGE);

    expect(events).toHaveLength(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('passes the abort signal to every request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(page(rows(1), 1));
    vi.stubGlobal('fetch', fetchMock);
    const { signal } = new AbortController();

    await getDividendCalendar('t', RANGE, signal);

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ signal });
  });

  it('stops after a short first page', async () => {
    // A total that disagrees with the page must not keep the loop going.
    const fetchMock = vi.fn().mockResolvedValue(page(rows(40), 150));
    vi.stubGlobal('fetch', fetchMock);

    const events = await getDividendCalendar('t', RANGE);

    expect(events).toHaveLength(40);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stops after one request when meta is missing', async () => {
    const fetchMock = vi.fn().mockResolvedValue(page(rows(100)));
    vi.stubGlobal('fetch', fetchMock);

    const events = await getDividendCalendar('t', RANGE);

    expect(events).toHaveLength(100);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws the backend errorMessage on a non-200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ code: 500, errorMessage: 'calendar exploded' }),
      } as unknown as Response)
    );

    await expect(getDividendCalendar('t', RANGE)).rejects.toThrow('calendar exploded');
  });
});
