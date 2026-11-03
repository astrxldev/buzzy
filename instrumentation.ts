import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_RUNTIME !== "nodejs"
  )
    return;

  const { getPostHogClient } = await import("./lib/posthog-server");

  let distinctId: string | undefined;
  const cookie = request.headers.cookie;
  const raw = (Array.isArray(cookie) ? cookie.join("; ") : cookie)?.match(
    /ph_phc_.*?_posthog=([^;]+)/,
  )?.[1];
  if (raw) {
    try {
      distinctId = JSON.parse(decodeURIComponent(raw)).distinct_id;
    } catch {}
  }

  getPostHogClient().captureException(error, distinctId, {
    path: request.path,
    method: request.method,
    route_path: context.routePath,
    route_type: context.routeType,
  });
};
