import type { Socket } from 'socket.io';

export const RATE_LIMIT_MESSAGE = 'Too many requests — try again in a moment';

export function socketClientIp(client: Socket): string {
  const forwardedFor = client.handshake.headers['x-forwarded-for'];
  const header = Array.isArray(forwardedFor) ? forwardedFor.at(-1) : forwardedFor;
  const lastEntry = header?.split(',').at(-1)?.trim();
  return lastEntry || client.handshake.address;
}
