import { query } from "$app/server";
import { z } from "zod";
import { searchGuides as searchGuidesFromDb } from "$lib/server/data";

export const searchGuides = query(z.string(), async (search) => {
  return await searchGuidesFromDb(search);
});
