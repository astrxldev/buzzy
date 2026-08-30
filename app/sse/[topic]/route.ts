import { adminCheck } from "@/lib/auth";
import { adminSseList, sse, tlSse } from "@/lib/db/sse-endpoints";
import { createSseHandler } from "./handler";

export const GET = createSseHandler({
  endpoints: sse as unknown as Parameters<
    typeof createSseHandler
  >[0]["endpoints"],
  adminTopics: adminSseList,
  adminCheck,
  tierListEndpoint: tlSse,
});
