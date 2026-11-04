import {
  createGoal,
  deleteGoal,
  getGoal,
  GoalLimitError,
  GoalNotFoundError,
  listGoals,
  updateGoal,
  type GoalBody,
} from './goals';

afterEach(() => vi.unstubAllGlobals());

function reply(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const body: GoalBody = {
  name: 'Retirement',
  kind: 'projection',
  currency: 'THB',
  startingAmount: 0,
  monthlyAmount: 10000,
  targetAmount: null,
  years: 30,
  expectedReturn: 8,
  contributionGrowth: null,
  inflation: 3,
  portfolioId: null,
};

describe('goals api', () => {
  it('lists every goal in one page from the list envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { code: 200, results: [{ id: 'g1' }], meta: { total: 1 } }));
    vi.stubGlobal('fetch', fetchMock);

    const out = await listGoals('t');

    expect(out).toEqual([{ id: 'g1' }]);
    const [url, init] = fetchMock.mock.calls[0];
    const u = new URL(url as string, 'http://x');
    expect(u.pathname).toMatch(/\/goals$/);
    expect(u.searchParams.get('size')).toBe('100');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer t' });
  });

  it('treats a missing results array as no goals', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(200, { code: 200, results: null })));
    await expect(listGoals('t')).resolves.toEqual([]);
  });

  it('gets one goal and maps 404 to GoalNotFoundError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(200, { code: 200, result: { id: 'g1' } })));
    await expect(getGoal('t', 'g1')).resolves.toEqual({ id: 'g1' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(404, { code: 404, errorMessage: 'goal not found' })));
    await expect(getGoal('t', 'nope')).rejects.toBeInstanceOf(GoalNotFoundError);
  });

  it('creates with POST and a JSON body, and maps 409 to GoalLimitError', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(201, { code: 201, result: { id: 'g1', ...body } }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(createGoal('t', body)).resolves.toMatchObject({ id: 'g1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/goals$/);
    expect(init).toMatchObject({ method: 'POST' });
    expect(JSON.parse((init as RequestInit).body as string)).toEqual(body);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(409, { code: 409, errorMessage: 'goal limit reached' })));
    await expect(createGoal('t', body)).rejects.toBeInstanceOf(GoalLimitError);
  });

  it('surfaces the backend message on a 400', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(400, { code: 400, errorMessage: 'portfolioId not found' })));
    await expect(createGoal('t', body)).rejects.toThrow('portfolioId not found');
  });

  it('replaces a goal with PUT', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { code: 200, result: { id: 'g/1' } }));
    vi.stubGlobal('fetch', fetchMock);
    await updateGoal('t', 'g/1', body);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/goals\/g%2F1$/);
    expect(init).toMatchObject({ method: 'PUT' });
  });

  it('deletes with a 204 and throws the backend message otherwise', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(204, undefined));
    vi.stubGlobal('fetch', fetchMock);
    await expect(deleteGoal('t', 'g1')).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(404, { code: 404, errorMessage: 'goal not found' })));
    await expect(deleteGoal('t', 'g1')).rejects.toThrow('goal not found');
  });
});
