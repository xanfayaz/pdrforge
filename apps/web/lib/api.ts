const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

/**
 * Browser calls stay on the page host. Next proxies /api/v1 to Nest,
 * so one public address is enough for a phone.
 */
export function apiBase() {
  if (typeof window !== 'undefined') {
    try {
      const url = new URL(CONFIGURED_API_URL);
      const localApi = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      if (localApi) return `${window.location.origin}/api/v1`;
    } catch {
      return `${window.location.origin}/api/v1`;
    }
  }
  return CONFIGURED_API_URL.replace(/\/$/, '');
}

export const API_URL = CONFIGURED_API_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function media(url?: string | null) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${apiBase().replace(/\/api\/v1\/?$/, '')}${url}`;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = typeof window !== 'undefined' ? localStorage.getItem('pdrforge_token') : null;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, { ...init, headers });
  } catch {
    throw new ApiError('API не отвечает. Запустите сервер и PostgreSQL — команда npm run dev.', 0);
  }
  if (response.status === 401 && !path.startsWith('/auth/demo')) {
    localStorage.removeItem('pdrforge_token');
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError('Нужно войти', 401);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({ message: 'Ошибка запроса' }));
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Ошибка запроса';
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('json')) return undefined as T;
  return response.json() as Promise<T>;
}

export async function download(path: string, filename: string) {
  const headers = new Headers();
  const token = localStorage.getItem('pdrforge_token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${apiBase()}${path}`, { headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ message: 'Не удалось скачать файл' }));
    throw new ApiError(data.message || 'Не удалось скачать файл', response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
