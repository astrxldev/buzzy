import ReconnectingEventSource from "reconnecting-eventsource";
import type z from "zod";

export const redis = typeof Bun !== "undefined" ? Bun.redis : null;

type PubPayload = { event?: string; data: unknown };

export class PubSubManager {
  private pub;
  private sub;
  private readonly prefix = "sse:";
  constructor() {
    if (!redis) throw new Error("Redis is not available in this environment.");
    this.pub = redis.duplicate();
    this.sub = redis.duplicate();
  }

  private constructMessage(data: unknown, event?: string) {
    return `${event ? `event: ${event}\n` : ""}data: ${JSON.stringify(data)}\n\n`;
  }

  async publish(
    data: unknown,
    { event, topic = "_global" }: { event?: string; topic?: string } = {},
  ) {
    console.log(` PUB ${topic}`);

    const pub = await this.pub;
    return pub.publish(
      `${this.prefix}${topic}`,
      JSON.stringify({ data, event } satisfies PubPayload),
    );
  }

  async new(
    topic = "_global",
    {
      signal,
      motd,
    }: {
      signal?: AbortSignal;
      motd?: PubPayload | PubPayload[];
    } = {},
  ) {
    console.log(` SUB ${topic}`);

    var timeout: Timer;
    var heartbeatTimeout: Timer;
    const sub = await this.sub;
    const { readable: r, writable: w } = new TransformStream();
    const writer = w.getWriter();
    function ping() {
      clearTimeout(heartbeatTimeout);
      heartbeatTimeout = setTimeout(() => {
        void writer.write(":)\n\n").catch(() => {});
        ping();
      }, 90000); // cloudflare timeout = 100s
    }

    const write = (payload: PubPayload) => {
      void writer
        .write(this.constructMessage(payload.data, payload.event))
        .catch(() => {});
      ping();
    };

    writer.write(`:${topic}\n\n`);
    ping();

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => close(), 1.8e6); // 30 minutes
    };
    const handler = (payload: string) => {
      const p: PubPayload = JSON.parse(payload);
      write(p);
      resetTimer();
    };
    const close = () => {
      console.log(` DSC ${topic}`);

      sub.unsubscribe(`${this.prefix}${topic}`, handler);
      clearInterval(heartbeatTimeout);
      clearTimeout(timeout);
    };

    resetTimer();
    sub.subscribe(`${this.prefix}${topic}`, handler);
    signal?.addEventListener("abort", close, { once: true });

    if (Array.isArray(motd)) motd.map((m) => write(m));
    else if (motd) write(motd);

    return new Response(r, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }
}

export type EventSourceEventMap = Record<string, z.ZodTypeAny>;
export type SubOption = {
  endpoint?: URL | string;
  onerror?: () => void;
  onopen?: () => void;
};

export class EventSourceEndpoint<T extends EventSourceEventMap> {
  private manager = ps;
  private readonly defaultEndpointUrl = new URL(
    `/sse/${this.endpoint}`,
    typeof location === "undefined" ? process.env.BASE_URL : location.href,
  );

  constructor(
    private endpoint: string,
    private eventMap: T,
  ) {}

  pub<K extends keyof T>(event: K, data: z.infer<T[K]>) {
    if (!this.manager)
      throw new Error(
        "EventSourceEndpoint.pub(...) can only be called on the server.",
      );
    return this.manager.publish(this.eventMap[event].parse(data), {
      topic: this.endpoint,
      event: String(event),
    });
  }

  subMany(
    events: Partial<{ [K in keyof T]: (data: z.infer<T[K]>) => void }>,
    {
      endpoint = this.defaultEndpointUrl,
      onerror = () => {},
      onopen = () => {},
    }: SubOption = {},
  ) {
    const es = new ReconnectingEventSource(endpoint);
    for (const [event, callback] of Object.entries(events)) {
      const listener = (e: MessageEvent<string>) =>
        callback?.(JSON.parse(e.data));
      es.addEventListener(event, listener);
    }
    es.onerror = onerror;
    es.onopen = onopen;
    return { clean: () => es.close(), es };
  }

  sub<K extends keyof T>(
    event: K,
    callback: (data: z.infer<T[K]>) => void,
    {
      endpoint = this.defaultEndpointUrl,
      onerror = () => {},
      onopen = () => {},
    }: SubOption = {},
  ) {
    const listener = (e: MessageEvent<string>) => callback(JSON.parse(e.data));
    const es = new ReconnectingEventSource(endpoint);
    es.addEventListener(String(event), listener);
    es.onerror = onerror;
    es.onopen = onopen;
    return { clean: () => es.close(), es };
  }

  stream(opt?: {
    signal?: AbortSignal | undefined;
    motd?: PubPayload | PubPayload[] | undefined;
  }) {
    return this.manager?.new(this.endpoint, opt);
  }
}

export function sseEndpoint<M extends EventSourceEventMap>(
  endpoint: string,
  eventMap: M,
): EventSourceEndpoint<M> {
  return new EventSourceEndpoint(endpoint, eventMap);
}

export function sseEndpointMap<M extends Record<string, EventSourceEventMap>>(
  map: M,
): { [K in keyof M]: EventSourceEndpoint<M[K]> } {
  const endpoints = {} as { [K in keyof M]: EventSourceEndpoint<M[K]> };
  for (const key in map) {
    endpoints[key] = new EventSourceEndpoint(key, map[key]);
  }
  return endpoints;
}

export const ps = redis === null ? null : new PubSubManager();
