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
  const data = await res.json();
  if (res.ok && data.code === 200) return data.result as User;
  return null;
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
