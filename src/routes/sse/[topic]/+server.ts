import type { RequestHandler } from "./$types";
import { adminCheck } from "@/lib/auth";
import { adminSseList, sse, tlSse } from "@/lib/db/sse-endpoints";

function isValidKey<T extends { [x: string]: unknown }>(
  map: T,
  key: string | number | symbol,
): key is keyof T {
  return Object.hasOwn(map, key);
}

const tlRegex = /^tl\.([a-z0-9.-_]+)$/;

export const GET: RequestHandler = async ({ params, request }) => {
  const { topic } = params;
  const tlMatch = topic.match(tlRegex);
  if (tlMatch) {
    return (
      tlSse(tlMatch[1]).stream({ signal: request.signal }) ??
      new Response("SSE is unavailable", { status: 503 })
    );
  }

  if (!isValidKey(sse, topic)) {
    return new Response("Invalid SSE Endpoint", { status: 404 });
  }

  if (adminSseList.includes(topic) && !(await adminCheck(request.headers))) {
    return new Response("Unauthorized", { status: 401 });
  }

  return (
    sse[topic].stream({ signal: request.signal }) ??
    new Response("SSE is unavailable", { status: 503 })
  );
};
