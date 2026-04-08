import z from "zod/v4";
import type { YoutubeLiveInfo } from "@/app/api/live/route";
import { sseEndpoint, sseEndpointMap } from "./redis";
import type { auditLog, tierlistStates } from "./schema";

export const sse = sseEndpointMap({
  // Artifact Admin Listener
  artifact: {
    update: z.object({
      type: z.enum(["setLimit", "wipe", "submit", "toggleCheck", "toggleLock"]),
    }),
  },
  // Rubgram Admin Listener
  rubgram: {
    update: z
      .object({
        type: z.enum([
          "setLimit",
          "wipe",
          "toggleCheck",
          "toggleLock",
          "setFree",
          "cancel",
          "uploadSlip",
        ]),
      })
      .or(
        z.object({
          type: z.enum(["submit", "paid"]),
          sub: z.string(),
        }),
      ),
  },
  // Passive Update Checker
  active: {
    version: z.string(),
    live: z.custom<YoutubeLiveInfo>(),
  },
  // Admin Live Log
  log: {
    update: z.custom<typeof auditLog.$inferSelect>(),
  },
});
export function tlSse<T extends string>(list: T) {
  return sseEndpoint(`tl.${list}`, {
    update_states: z.custom<(typeof tierlistStates.$inferSelect)[]>(),
    update_placements: z.record(z.string(), z.string().array()),
  });
}
