import type { ApiErrorResponse, ApiResponse } from '@dice-app/contracts';
import { randomId } from './randomId';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Dev convenience: with a localhost API URL, a page opened by LAN IP (e.g. from a phone) calls
// the API on that same IP. Front and API must share the host, or the host cookie is not sent.
// A non-localhost API URL (production) is used as-is.
function resolveApiUrl(): string | undefined {
  if (!API_URL || typeof window === 'undefined') {
    return API_URL;
  }

  const url = new URL(API_URL);
  if (url.hostname !== 'localhost' || window.location.hostname === 'localhost') {
    return API_URL;
  }

  url.hostname = window.location.hostname;
  return url.origin;
}

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
};

// Every mutating request gets a fresh Idempotency-Key; the server rejects POSTs without one.
export async function apiRequest<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (method !== 'GET') {
    headers['Idempotency-Key'] = randomId();
  }

  const response = await fetch(`${resolveApiUrl()}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const result: ApiResponse<T> | ApiErrorResponse | null = await response.json().catch(() => null);

  if (!response.ok || !result) {
    throw new ApiError(response.status, result?.message ?? 'Request failed');
  }

  return (result as ApiResponse<T>).data;
}
