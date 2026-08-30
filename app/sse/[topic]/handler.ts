type Endpoint = {
  stream: (options: {
    signal: AbortSignal;
  }) => Response | Promise<Response> | undefined;
};

const stream = async (endpoint: Endpoint, signal: AbortSignal) => {
  const response = await endpoint.stream({ signal });
  if (!response) return new Response("SSE unavailable", { status: 503 });
  return response;
};

export const tierListTopic = /^tl\.([a-z0-9._-]+)$/;

export function createSseHandler(dependencies: {
  endpoints: Record<string, Endpoint>;
  adminTopics: readonly string[];
  adminCheck: () => Promise<unknown>;
  tierListEndpoint: (id: string) => Endpoint;
}) {
  return async function GET(
    req: Request,
    { params }: { params: Promise<{ topic: string }> },
  ) {
    const { topic } = await params;
    const tierList = tierListTopic.exec(topic);
    if (tierList)
      return stream(dependencies.tierListEndpoint(tierList[1]), req.signal);

    const endpoint = dependencies.endpoints[topic];
    if (!endpoint) return new Response("Invalid SSE Endpoint", { status: 404 });
    if (
      dependencies.adminTopics.includes(topic) &&
      !(await dependencies.adminCheck())
    )
      return new Response("Unauthorized", { status: 401 });
    return stream(endpoint, req.signal);
  };
}
