import type { tierlistStates } from "./db/schema";

export type TierlistState = typeof tierlistStates.$inferSelect;

export type TierlistSyncData = {
  states: TierlistState[];
  placements: Record<string, string[]>;
};

export type TierlistWriteResult<T> = {
  persisted: true;
  data: T;
  publication: "sent" | "failed";
};
