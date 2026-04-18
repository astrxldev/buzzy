import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
  api_host: "/i",
  ui_host: "https://us.posthog.com",
  defaults: "2026-01-30",
  capture_exceptions: true,
  debug: process.env.ENVIRONMENT === "development",

  before_send: (event) => {
    if (event?.event === "$exception") {
      const exceptionList = event.properties.$exception_list || [];
      const exception = exceptionList[0];
      if (exception?.value === "NEXT_REDIRECT") {
        return null; // Drop it entirely
      }
    }
    return event;
  },
});
