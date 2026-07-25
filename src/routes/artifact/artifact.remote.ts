import { query } from "$app/server";
import { db } from "@/lib/db";
import { characters } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const checkEnkaStatus = query(
  z.object({ uid: z.string(), character: z.string(), nonce: z.number() }),
  async ({ uid, character }) => {
    const [selected] = await db
      .select({ amber: characters.amber })
      .from(characters)
      .where(eq(characters.name, character))
      .limit(1);
    const response = await fetch(
      `https://api.astrxl.dev/v1/card/genshin/${uid}/${selected ? selected.amber.split("-")[0] : "10000005"}?debug=dump`,
    );
    const text = await response.text();
    if (text === "Character not found in showcase") return "showcase" as const;
    if (text === "The showcase for this UID is private") return "private" as const;
    if (response.status === 404) return "nf" as const;
    return null;
  },
);
