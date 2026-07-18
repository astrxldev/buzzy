import { error } from "@sveltejs/kit";
import { command, getRequestEvent } from "$app/server";
import { z } from "zod";
import { adminCheck } from "@/lib/auth";
import {
  saveTierlistPlacements,
  saveTierlistState,
} from "$lib/server/data";

export const savePlacements = command(
  z.object({
    list: z.string(),
    placements: z.record(z.string(), z.array(z.string())),
  }),
  async ({ list, placements }) => {
    const event = getRequestEvent();
    if (!(await adminCheck(event.request.headers))) error(401, "Unauthorized");
    return await saveTierlistPlacements(list, placements);
  },
);

export const saveState = command(
  z.object({
    uuid: z.string().optional(),
    ref: z.string(),
    char: z.string(),
    list: z.string(),
    comment: z.string().default(""),
    badges: z.array(z.string()).default([]),
  }),
  async (data) => {
    const event = getRequestEvent();
    if (!(await adminCheck(event.request.headers))) error(401, "Unauthorized");
    const result = await saveTierlistState(data);
    if ("error" in result) error(400, result.error);
    return result;
  },
);
