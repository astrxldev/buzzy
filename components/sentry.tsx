"use client";

import { useSentryToolbar } from "@sentry/toolbar";
import { comms } from "@/lib/comms";

export function SentryDevToolbar() {
  const [debug] = comms.var("debug");

  useSentryToolbar({
    // Remember to conditionally enable the Toolbar.
    // This will reduce network traffic for users
    // who do not have credentials to login to Sentry.
    enabled: debug === true,
    initProps: {
      organizationSlug: "astrxldev",
      projectIdOrSlug: "buzz",
      theme: "dark",
    },
  });

  return "";
}
