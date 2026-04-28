import type { Due, Player, PlayersResponse } from '../types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

function getToken(): string | null {
  return localStorage.getItem('akoka_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Resolves a stored photo path to a full URL usable in <img src>. */
export function getMediaUrl(photoPath: string | null | undefined): string | null {
  if (!photoPath) return null;
  if (photoPath.startsWith('http')) return photoPath; // Cloudinary or external URL
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || '';
  return apiBase ? apiBase.replace(/\/api\/?$/, '') + photoPath : photoPath;
}

export interface PlayerInput {
  name: string;
  nickname?: string | null;
  date_of_birth?: string | null;
  phone_number?: string | null;
  jersey_number?: number | null;
  position?: string | null;
}

export const api = {
  getPlayers: (page = 1, limit = 10, search = '') =>
    request<PlayersResponse>(
      `/players?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`
    ),

  getSettings: () => request<Record<string, string>>('/settings'),

  login: (username: string, password: string) =>
    request<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  addPlayer: (data: PlayerInput) =>
    request<Player>('/players', { method: 'POST', body: JSON.stringify(data) }),

  updatePlayer: (id: number, data: Partial<PlayerInput>) =>
    request<Player>(`/players/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deletePlayer: (id: number) =>
    request<{ success: boolean }>(`/players/${id}`, { method: 'DELETE' }),

  toggleDue: (playerId: number, month: number) =>
    request<Due>(`/dues/${playerId}/${month}`, { method: 'PATCH' }),

  changeYear: (year: number) =>
    request<{ activeYear: number }>('/settings/year', {
      method: 'PUT',
      body: JSON.stringify({ year }),
    }),

  uploadPhoto: async (playerId: number, formData: FormData): Promise<{ photo_url: string }> => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}/players/${playerId}/photo`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    return res.json();
  },
};
