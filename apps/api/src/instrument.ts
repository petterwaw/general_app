import dotenv from 'dotenv';
import * as Sentry from '@sentry/nestjs';

// Runs before Nest loads, so ConfigModule has not read the local .env yet. In production the
// file does not exist and the variables come from docker compose.
dotenv.config({ path: '../../.env', quiet: true });

// Without a DSN (local runs without one, tests, CI) the SDK stays off and sends nothing.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    // The defaults would send the device cookie, headers, request bodies, bound SQL parameters
    // (the device secret hash among them) and local variables. A stack trace is enough.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      databaseQueryData: false,
      stackFrameVariables: false,
    },
  });
}
