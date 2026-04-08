import { sse, tlSse } from "@/lib/db/sse-endpoints";

function isValidKey<T extends { [x: string]: unknown }>(
  map: T,
  key: string | number | symbol,
): key is keyof T {
  return Object.hasOwn(map, key);
}

const tlRegex = /^tl\.([a-z0-9.-_]+)$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ topic: string }> },
) {
  const { topic } = await params;
  if (tlRegex.test(topic)) return tlSse(topic.match(tlRegex)![1]).stream();
  if (!isValidKey(sse, topic))
    return new Response("Invalid SSE Endpoint", { status: 404 });
  return sse[topic].stream();
}
