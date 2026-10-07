import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./sentry-options";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init(sentryOptions);
  }
}

export const onRequestError = Sentry.captureRequestError;
