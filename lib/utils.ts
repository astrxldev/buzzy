import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ServerEventSource = {
  send: (data: unknown, event?: string) => void;
  write: (msg: string) => void;
  close: () => void;
  topic: string;
  id: number;
};

type EventSourceMOTD = { event?: string; data: string };

export class EventSourceManager {
  private list: ServerEventSource[] = [];
  private id = 0;
  new(
    topic = "_global",
    {
      onDisconnect,
      signal,
      motd,
    }: {
      onDisconnect?: () => void;
      signal?: AbortSignal;
      motd?: EventSourceMOTD | EventSourceMOTD[];
    } = {},
  ): Response {
    let timeout: NodeJS.Timeout | undefined;
    this.id++;
    if (this.id > 100000) this.id = 0;
    const id = this.id;
    console.log(` SUB ${topic}#${id} (C${this.list.length})`);

    const push = (s: ServerEventSource) => {
      this.list.push(s);

      // Send MOTD
      if (Array.isArray(motd)) motd.map((m) => s.send(m.data, m.event));
      else if (motd) s.send(motd.data, motd.event);
    };
    const remove = (id: number) => {
      if (this.list.findIndex((e) => e.id === id) < 0) return;
      console.log(` DSC ${topic}#${id}`);
      this.list = this.list.toSpliced(
        this.list.findIndex((e) => e.id === id),
        1,
      );
      onDisconnect?.();
    };

    signal?.addEventListener("abort", () => {
      clearInterval(timeout);
      remove(id);
    });

    return new Response(
      new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          // Register this client
          const res = {
            send: (data: unknown, event?: string) =>
              res.write(
                `${event ? `event: ${event}\n` : ""}data: ${JSON.stringify(data)}\n\n`,
              ),
            write: (msg: string) => controller.enqueue(encoder.encode(msg)),
            close: () => {
              try {
                controller.close();
              } catch {}
              clearTimeout(timeout);
              remove(res.id);
            },
            topic,
            id,
          };
          timeout = setInterval(() => {
            if (controller.desiredSize === null) return res.close();
            try {
              res.write(`:ping\n\n`);
            } catch {
              res.close();
            }
          }, 5000);
          push(res);
        },
        cancel() {
          clearTimeout(timeout);
          remove(id);
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      },
    );
  }

  publish(
    data: unknown,
    { event, topic = "_global" }: { event?: string; topic?: string },
  ) {
    console.log(` PUB #${topic}`);
    queueMicrotask(() => {
      for (const s of this.list) {
        if (s.topic !== topic) continue;
        try {
          s.send(data, event);
        } catch (error) {
          console.error(`  ERR #${topic}#${s.id}, ${error}`);
        }
      }
    });
  }

  count(topic = "_global") {
    return this.list.reduce((c, s) => c + (s.topic === topic ? 1 : 0), 0);
  }
}

export const sse = new EventSourceManager();

export const b2s = (t: number) => {
  let e = (Math.log2(t) / 10) | 0;
  return `${(t / 1024 ** (e = e <= 0 ? 0 : e)).toFixed(1)}${" KMGP"[e]}B`;
};

type Node = { count: number; next: Map<string, Node> };

function node(): Node {
  return { count: 0, next: new Map() };
}

// find unique shortest code for each string
export function shortestPrefixes(values: readonly string[]) {
  const uniq = [...new Set(values)];
  const root = node();

  for (const v of uniq) {
    let cur = root;
    for (const ch of v) {
      let n = cur.next.get(ch);
      if (!n) cur.next.set(ch, (n = node()));
      n.count++;
      cur = n;
    }
  }

  const res = new Map<string, string>();
  for (const v of uniq) {
    let cur = root;
    let prefix = "";
    for (const ch of v) {
      const n = cur.next.get(ch)!;
      prefix += ch;
      if (n.count === 1) break;
      cur = n;
    }
    res.set(v, prefix);
  }

  return res;
}

export function parseSearchNumber(
  param: string | string[] | undefined,
  def: number = 0,
) {
  if (Array.isArray(param)) return parseSearchNumber(param[0], def);
  const parsed = parseFloat(param ?? "");
  return Number.isNaN(parsed) ? def : parsed;
}

export function parseSearchString(
  param: string | string[] | undefined,
  def: string = "",
) {
  if (Array.isArray(param)) return parseSearchString(param[0], def);
  return param ?? def;
}
