const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1`;

const LOGIN_TIMEOUT_MS = 15000;

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

/** Rethrow fetch failures as friendly, user-facing messages. */
function toFriendlyError(e: unknown): never {
  if (e instanceof DOMException && e.name === 'TimeoutError') {
    throw new Error('The request timed out. Please check your connection and try again.');
  }
  if (e instanceof TypeError) {
    // Network failure (e.g. offline, DNS, CORS): fetch rejects with a TypeError.
    throw new Error('Unable to reach the server. Please check your connection and try again.');
  }
  throw e instanceof Error ? e : new Error('Something went wrong. Please try again.');
}

export async function getMe(token: string): Promise<User | null> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(LOGIN_TIMEOUT_MS),
    });
  } catch (e) {
    toFriendlyError(e);
  }
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.code === 200) return data.result as User;
  if (res.status === 404) return null; // confirmed: no user record yet
  throw new Error(data.errorMessage || 'Failed to load user profile');
}

export async function createMe(token: string): Promise<User> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/users/me`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(LOGIN_TIMEOUT_MS),
    });
  } catch (e) {
    toFriendlyError(e);
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.errorMessage || 'Failed to create user account');
  return data.result as User;
}
