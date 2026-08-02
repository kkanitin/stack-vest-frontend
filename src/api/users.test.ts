import { getMe, AuthError } from './users';

afterEach(() => vi.unstubAllGlobals());

describe('getMe', () => {
  it('returns the user on a 200 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ code: 200, result: { id: '1', name: 'A', email: 'a@b.com', picture: '' } }),
      } as unknown as Response)
    );
    const user = await getMe('t');
    expect(user).toEqual({ id: '1', name: 'A', email: 'a@b.com', picture: '' });
  });

  it('returns null on a confirmed 404 (no user record yet)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ errorMessage: 'not found' }),
      } as unknown as Response)
    );
    expect(await getMe('t')).toBeNull();
  });

  it('throws on a non-404 failure instead of returning null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ errorMessage: 'server exploded' }),
      } as unknown as Response)
    );
    await expect(getMe('t')).rejects.toThrow('server exploded');
  });

  it.each([401, 403])('throws AuthError on a %i so the caller can drop the session', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status,
        json: async () => ({ errorMessage: 'token revoked' }),
      } as unknown as Response)
    );
    await expect(getMe('t')).rejects.toBeInstanceOf(AuthError);
  });

  it('does not throw AuthError on a 500, so a transient failure keeps the session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ errorMessage: 'server exploded' }),
      } as unknown as Response)
    );
    await expect(getMe('t')).rejects.not.toBeInstanceOf(AuthError);
  });

  it('surfaces a fallback message instead of a JSON parse error on a non-JSON error body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      } as unknown as Response)
    );
    await expect(getMe('t')).rejects.toThrow('Failed to load user profile');
  });
});
