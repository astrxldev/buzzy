import { sse } from "@/lib/db/sse-endpoints";
import { createActiveHandler } from "./handler";

const version = Bun.file(".version");

export const GET = createActiveHandler({
  file: version,
  randomUUID: crypto.randomUUID,
  isDevelopment: () => process.env.ENVIRONMENT === "development",
  stream: (options) => {
    const response = sse.active.stream(options);
    if (!response) throw new Error("SSE is unavailable");
    return response;
  },
});
