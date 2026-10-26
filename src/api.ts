import type { Application, ApplicationInput, LoginResponse, ReviewerUser } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';
const TOKEN_KEY = 'compro_reviewer_token';

let currentToken: string | null = null;

try {
  currentToken = sessionStorage.getItem(TOKEN_KEY);
} catch {
  // ignore storage errors
}

export function getAuthToken(): string | null {
  return currentToken;
}

export function setAuthToken(token: string | null): void {
  currentToken = token;
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed.message) message = parsed.message;
      else if (parsed.error) message = parsed.error;
    } catch {
      // ignore
    }
    throw new Error(message || `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Public
  health: () => request<{ status: string }>('/health'),
  submit: (input: ApplicationInput) =>
    request<Application>('/applications', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // Auth
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const data = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setAuthToken(data.token);
    return data;
  },
  logout: async (): Promise<void> => {
    try {
      await request<{ success: boolean }>('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      setAuthToken(null);
    }
  },
  me: () => request<ReviewerUser>('/auth/me'),

  // Reviewer Protected
  list: () => request<Application[]>('/applications'),
  get: (id: number) => request<Application>(`/applications/${id}`),
  decide: (id: number, decision: Application['decision'], reviewerNote: string) =>
    request<Application>(`/applications/${id}/decision`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, reviewerNote }),
    }),
};
