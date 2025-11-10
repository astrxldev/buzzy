import { sse } from "@/lib/utils";

const VERSION = crypto.randomUUID();

export function GET() {
  sse.publish(VERSION, {
    topic: "active",
    event: "version",
  });
  sse.publish(sse.count("active"), {
    topic: "active",
    event: "count",
  });

  return sse.new("active", {
    onDisconnect() {
      sse.publish(sse.count("active"), { topic: "active", event: "count" });
    },
  });
}
