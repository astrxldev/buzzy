// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { env } from "node:process";
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://9a918fb166b0abde6cbb698191ac61c9@o4510549315420160.ingest.us.sentry.io/4510549315616768",

  enabled: env.ENVIRONMENT === "production",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
