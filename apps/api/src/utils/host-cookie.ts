import type { CookieOptions, NextFunction, Request, Response } from 'express';

const HOST_COOKIE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export const hostCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  maxAge: HOST_COOKIE_MAX_AGE_MS,
};

// Sliding expiry: every page visit (a GET) re-issues the host cookie, so it expires only after
// 90 days without a visit. POSTs are skipped — creating a game may issue a new secret itself.
export function refreshHostCookie(request: Request, response: Response, next: NextFunction) {
  const secret: unknown = request.cookies?.host_secret;
  if (request.method === 'GET' && typeof secret === 'string') {
    response.cookie('host_secret', secret, hostCookieOptions);
  }
  next();
}
