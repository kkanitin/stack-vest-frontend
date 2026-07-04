const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1`;

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export async function getMe(token: string): Promise<User | null> {
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.code === 200) return data.result as User;
  if (res.status === 404) return null; // confirmed: no user record yet
  throw new Error(data.errorMessage || 'Failed to load user profile');
}

export async function createMe(token: string): Promise<User> {
  const res = await fetch(`${API_BASE}/users/me`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errorMessage || 'Failed to create user account');
  return data.result as User;
}
