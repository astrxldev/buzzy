import { sse } from "@/lib/utils";

const VERSION = crypto.randomUUID();

export function GET({ signal }: Request) {
  // +1 because this connection is not yet counted
  sse.publish(sse.count("active") + 1, {
    topic: "active",
    event: "count",
  });

  return sse.new("active", {
    onDisconnect() {
      // no need to -1 because this connection is already removed
      sse.publish(sse.count("active"), { topic: "active", event: "count" });
    },
    motd: {
      data: VERSION,
      event: "version",
    },
    signal,
  });
}
