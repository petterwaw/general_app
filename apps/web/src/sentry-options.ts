// Shared by the browser and the Next server. Without a DSN (local runs, CI) Sentry stays off.
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // The defaults would send the device cookie, headers, request bodies and local variables.
  // A stack trace is enough.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    stackFrameVariables: false,
  },
};
