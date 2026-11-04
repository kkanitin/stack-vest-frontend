import { describeFxRate, FX_API_BASE, fxCurrencyCode, getFxRate } from './fx';

afterEach(() => vi.unstubAllGlobals());

function reply(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

describe('fx api', () => {
  it('fetches today’s rate for one pair', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      reply(200, { amount: 1, base: 'USD', date: '2026-11-04', rates: { THB: 35.2 } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getFxRate('USD', 'THB')).resolves.toEqual({ from: 'USD', to: 'THB', rate: 35.2, date: '2026-11-04' });
    expect(fetchMock).toHaveBeenCalledWith(`${FX_API_BASE}/latest?base=USD&symbols=THB`);
  });

  it('throws on an error reply or a missing rate', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(404, { message: 'not found' })));
    await expect(getFxRate('USD', 'XXX')).rejects.toThrow('not found');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(200, { rates: {} })));
    await expect(getFxRate('USD', 'THB')).rejects.toThrow('Failed to load the exchange rate');
  });

  it('throws when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(getFxRate('USD', 'THB')).rejects.toThrow('Failed to fetch');
  });
});

describe('fxCurrencyCode', () => {
  it('accepts supported ISO codes, any case and spacing', () => {
    expect(fxCurrencyCode('THB')).toBe('THB');
    expect(fxCurrencyCode(' usd ')).toBe('USD');
  });

  it('rejects labels the rates do not cover', () => {
    expect(fxCurrencyCode('Baht')).toBeNull();
    expect(fxCurrencyCode('BTC')).toBeNull();
    expect(fxCurrencyCode('')).toBeNull();
    expect(fxCurrencyCode(null)).toBeNull();
  });
});

describe('describeFxRate', () => {
  it('gives the rate and its day', () => {
    expect(describeFxRate({ from: 'USD', to: 'THB', rate: 35.2, date: '2026-11-04' })).toBe('1 USD = 35.20 THB, 4 Nov 2026');
  });

  it('keeps small rates readable and drops an unknown date', () => {
    expect(describeFxRate({ from: 'THB', to: 'USD', rate: 0.028409, date: '' })).toBe('1 THB = 0.0284 USD');
  });
});
