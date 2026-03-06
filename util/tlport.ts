import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  characters,
  tierlistBadges,
  tierlistStates,
  tierlistVersions,
} from "@/lib/db/schema";

// bun util/tlport aby5.7b@aby:57b aby5.8@aby:58 abyLunaI-a@aby:l1 sty5.8@sty:s58 styLunaI@sty:sl1

const versions = process.argv
  .map((v) => v.match(/^([a-z\d._-]+)@([a-z]+):([\da-z]+)(!)?$/im))
  .map((v) => v && { source: v[1], type: v[2], ver: v[3], stygian: !!v[4] })
  .filter((v): v is InputVersion => !!(v && "source" in v));

if (!versions.length) {
  console.log("No version specified.");
  process.exit();
}

// #region constants
export const specialBadges = {
  abyss: ["L", "T", "SP"],
  stygian: ["L", "M", "T", "SP"],
};

const badges = [
  "C-",
  "C+",
  "B-",
  "B+",
  "A-",
  "A+",
  "S-",
  "S+",
  "SS-",
  "SS+",
  "SSS",
];

export function getBadges(stygian: boolean): string[] {
  return [...badges, ...specialBadges[stygian ? "stygian" : "abyss"]];
}
// #endregion

async function main() {
  console.log("Fetching characters...");
  const chars = await db.select().from(characters);
  console.log("Fetching badges...");
  const dbBadges = await db.select().from(tierlistBadges);
  return Promise.all(
    versions.map((v) =>
      db.transaction(async (tx) => {
        const data: BuzzierTierListData = await fetch(
          `https://buzz.sudloh.com/api/tierlist/${v.source}`,
        ).then((r) => r.json());
        if (
          Object.keys({ ...data.badges, ...data.comments, ...data.list })
            .length === 0
        )
          console.warn(`${v.source}: Empty TierList Data`);
        console.log(`${v.source}: Data Imported`);
        const filter = and(
          eq(tierlistVersions.id, v.ver),
          eq(tierlistVersions.type, v.type),
        );
        async function placements() {
          await tx
            .update(tierlistVersions)
            .set({
              placements: Object.fromEntries(
                Object.entries(data.list).map(([p, cl]) => [
                  p
                    .split(":")
                    .map((s, i) =>
                      i === 0
                        ? s === "SS"
                          ? "p"
                          : s.toLowerCase()
                        : `${{ "On field DPS": "nd", "Off field DPS": "fd", Support: "s" }[s]}`,
                    )
                    .join("-"),
                  p === "untiered"
                    ? []
                    : cl
                        .map((c) => chars.find((ch) => ch.name === c)?.id)
                        .filter((v): v is string => typeof v === "string"),
                ]),
              ),
            })
            .where(filter);
          console.log(`${v.source}: Placements Exported`);
        }
        async function states() {
          await db.delete(tierlistStates).where(eq(tierlistStates.list, v.ver));
          console.log(`${v.source}: Old States Cleared`);
          const badgeList = getBadges(v.stygian);
          const states: Record<
            string,
            Partial<{ comment: string; badges: string[] }>
          > = {};
          for (const [char, comment] of Object.entries(data.comments)) {
            states[char] ??= {};
            states[char].comment = comment;
          }
          for (const [char, badges] of Object.entries(data.badges)) {
            states[char] ??= {};
            states[char].badges = badges
              .map((b) => badgeList[b])
              .map((b) => dbBadges.find((e) => e.name === b)?.id)
              .filter((v): v is string => typeof v === "string");
          }
          const final = Object.entries(states)
            .map(([char, dat]): typeof tierlistStates.$inferInsert | false =>
              chars.find((c) => c.name === char)
                ? {
                    list: v.ver,
                    char: chars.find((c) => c.name === char)!.id!,
                    comment: dat.comment,
                    badges: dat.badges,
                    ref: chars.find((c) => c.name === char)!.id!,
                  }
                : false,
            )
            .filter(
              (s): s is typeof tierlistStates.$inferInsert => s !== false,
            );
          console.log(`${v.source}: New States Generated`);
          if (final.length) await db.insert(tierlistStates).values(final);
          console.log(`${v.source}: New States Exported`);
        }
        Promise.all([placements(), states()]).then(() =>
          console.log(`${v.source}: Done`),
        );
      }),
    ),
  );
}

main();

export interface BuzzierTierListData {
  list: Record<string, string[]>;
  badges: Record<string, number[]>;
  comments: Record<string, string>;
}

interface InputVersion {
  source: string;
  type: string;
  ver: string;
  stygian: boolean;
}
