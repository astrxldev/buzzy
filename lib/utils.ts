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

declare global {
  var sseList: ServerEventSource[];
}

if (!globalThis.sseList) {
  globalThis.sseList = [];
}

export class EventSourceManager {
  private id = 0;
  new(topic = "_global"): Response {
    let timeout: NodeJS.Timeout | undefined;
    this.id++;
    if (this.id > 100000) this.id = 0;
    const id = this.id;
    console.log(` SUB ${topic}#${id}`);

    const push = (s: ServerEventSource) => {
      globalThis.sseList.push(s);
    };
    const remove = (id: number) => {
      globalThis.sseList = globalThis.sseList.toSpliced(
        globalThis.sseList.findIndex((e) => e.id === id),
        1,
      );
      console.log(` SUB ${topic}#${id}`);
    };
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
            try {
              res.write(`:ping\n\n`);
            } catch {
              res.close();
            }
          }, 5000);
          push(res);
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
    setImmediate(() => {
      for (const s of globalThis.sseList) {
        if (s.topic !== topic) continue;
        try {
          s.send(data, event);
        } catch {}
      }
    });
  }

  count(topic = "_global") {
    return sseList.reduce((c, s) => c + (s.topic === topic ? 1 : 0), 0);
  }
}

export const sse = new EventSourceManager();

export const b2s = (t: number) => {
  let e = (Math.log2(t) / 10) | 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: copied
  return `${(t / 1024 ** (e = e <= 0 ? 0 : e)).toFixed(1)}${" KMGP"[e]}B`;
};
