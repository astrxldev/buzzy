export const redis = Bun.redis;

type PubMOTD = { event?: string; data: string };

export function optionalStringify(data: unknown | string) {
  try {
    if (typeof data !== "string") throw "";
    JSON.parse(data);
    return data;
  } catch {
    return JSON.stringify(data);
  }
}

export function optionalParse(data: unknown | string) {
  if (typeof data === "string") {
    try {
      return { parsed: true, data: JSON.parse(data) };
    } catch {}
  }
  return { parsed: false, data };
}

export class PubSubManager {
  private pub;
  private sub;
  private readonly prefix = "sse:";
  constructor() {
    this.pub = redis.duplicate();
    this.sub = redis.duplicate();
  }

  private constructMessage(data: string, event?: string) {
    return `${event ? `event: ${event}\n` : ""}data: ${optionalStringify(data)}\n\n`;
  }

  async publish(
    data: unknown,
    { event, topic = "_global" }: { event?: string; topic?: string } = {},
  ) {
    console.log(` PUB ${topic}`);

    const pub = await this.pub;
    return pub.publish(
      `${this.prefix}${topic}`,
      JSON.stringify({ data, event }),
    );
  }

  async new(
    topic = "_global",
    {
      signal,
      motd,
    }: {
      signal?: AbortSignal;
      motd?: PubMOTD | PubMOTD[];
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
        writer.write(":)\n\n");
        ping();
      }, 90000); // cloudflare timeout = 100s
    }
    const write: (payload: {
      data: string;
      event?: string;
    }) => void | ((data: string, event?: string) => void) = (
      p: { data: string; event?: string } | string,
      event?: string,
    ) => {
      if (typeof p === "string") writer.write(this.constructMessage(p, event));
      else writer.write(this.constructMessage(p.data, p.event));
      ping();
    };

    writer.write(`:${topic}\n\n`);
    ping();

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => close(), 1.8e6); // 30 minutes
    };
    const handler = (payload: string) => {
      const p = JSON.parse(payload);
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

export const ps = new PubSubManager();
