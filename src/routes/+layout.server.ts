import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = () => {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const directHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  return {
    posthog: token
      ? {
          token,
          apiHost: process.env.ENVIRONMENT === "production" ? "https://s.astrxl.dev" : directHost,
          uiHost: "https://us.posthog.com",
        }
      : null,
  };
};
