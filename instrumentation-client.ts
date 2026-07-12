import posthog from "posthog-js";

if (process.env.NODE_ENV === "production")
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
    api_host: "https://s.astrxl.dev",
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.ENVIRONMENT === "development",

    before_send: (event) => {
      if (event?.event === "$exception") {
        const exceptionList = event.properties.$exception_list || [];
        const exception = exceptionList[0];
        if (exception) {
          if (
            exception.$exception_source?.includes("posthog") ||
            exception.value?.includes("posthog") ||
            exception.value?.includes("__ph_opt_in_out") ||
            exception.value === "NEXT_REDIRECT"
          ) {
            return null;
          }
        }
      }
      return event;
    },
  });
