import type { ApiErrorResponse, ApiResponse } from '@dice-app/contracts';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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
    headers['Idempotency-Key'] = crypto.randomUUID();
  }

  const response = await fetch(`${API_URL}${path}`, {
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
