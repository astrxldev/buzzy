"use client";
import { createContext } from "react";
import type { characters, tierlistBadges } from "@/lib/db/schema";

export const TierListContext = createContext<{
  chars: (typeof characters.$inferSelect)[];
  badges: (typeof tierlistBadges.$inferSelect)[];
  tileSize: number;
  badgeSize: number;
}>({
  chars: [],
  badges: [],
  tileSize: 64,
  badgeSize: 24,
});
