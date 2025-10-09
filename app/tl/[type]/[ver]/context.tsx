"use client";
import { createContext } from "react";
import type { characters, tierlistBadges, tierlistStates } from "@/lib/db/schema";

export const TierListContext = createContext<{
  chars: (typeof characters.$inferSelect)[];
  badges: (typeof tierlistBadges.$inferSelect & { tier: string[] })[];
  tileSize: number;
  badgeSize: number;
  setState: (char: string, data: Partial<typeof tierlistStates.$inferInsert>) => void;
  editable: boolean;
}>({
  chars: [],
  badges: [],
  tileSize: 64,
  badgeSize: 24,
  setState: () => {},
  editable: false
});
