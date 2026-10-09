import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from './transactions';

afterEach(() => vi.unstubAllGlobals());

function reply(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('transactions api', () => {
  it('lists with filters, bearer token, and reads results + meta', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      reply(200, { code: 200, results: [{ id: 'a' }], meta: { total: 7 } })
    );
    vi.stubGlobal('fetch', fetchMock);

    const out = await listTransactions('t', 'p1', { symbol: 'AAPL', page: 2, size: 20 });

    expect(out.transactions).toHaveLength(1);
    expect(out.total).toBe(7);
    const [url, init] = fetchMock.mock.calls[0];
    const u = new URL(url as string, 'http://x');
    expect(u.pathname).toMatch(/\/portfolios\/p1\/transactions$/);
    expect(u.searchParams.get('symbol')).toBe('AAPL');
    expect(u.searchParams.get('page')).toBe('2');
    expect(u.searchParams.get('size')).toBe('20');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer t' });
  });

  it('surfaces the 409 message on create', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(reply(409, { code: 409, errorMessage: 'You only hold 3 AAPL.' }))
    );
    await expect(
      createTransaction('t', 'p1', {
        symbol: 'AAPL', name: 'Apple', side: 'sell', quantity: 5, price: 1, date: '2026-01-01',
      })
    ).rejects.toThrow('You only hold 3 AAPL.');
  });

  it('returns transaction + position on create and update', async () => {
    const result = { transaction: { id: 'x' }, position: null };
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(reply(201, { code: 201, result }))
      .mockResolvedValueOnce(reply(200, { code: 200, result })));
    const body = { symbol: 'A', name: 'A', side: 'buy' as const, quantity: 1, price: 1, date: '2026-01-01' };
    expect((await createTransaction('t', 'p', body)).transaction.id).toBe('x');
    expect((await updateTransaction('t', 'p', 'x', { quantity: 2 })).transaction.id).toBe('x');
  });

  it('surfaces the 409 message on update', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(reply(409, { code: 409, errorMessage: 'would oversell' }))
    );
    await expect(updateTransaction('t', 'p', 'x', { quantity: 1 })).rejects.toThrow('would oversell');
  });

  it('delete resolves on 204 and throws the server message otherwise', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 204 } as Response)
      .mockResolvedValueOnce(reply(409, { errorMessage: 'nope' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(deleteTransaction('t', 'p', 'x')).resolves.toBeUndefined();
    await expect(deleteTransaction('t', 'p', 'x')).rejects.toThrow('nope');
  });
});
