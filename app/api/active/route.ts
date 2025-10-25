import { sse } from "@/lib/utils";

const VERSION = crypto.randomUUID();

export function GET() {
  sse.publish(VERSION, {
    topic: "active",
    event: "version",
  });

  return sse.new("active");
}
