import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tierlistVersions } from "@/lib/db/schema";

const dat = await Bun.file("god.sql").text();
const matches = dat.matchAll(/^([a-z0-9-_]+)\t([a-zA-Z ]+)$/gm);
const mapping = Object.fromEntries(
  [...matches].map(([_, old, n]) => [old, n.toLowerCase().replace(/ /g, "_")]),
);
// console.log(mapping);

const versions = await db
  .select({ id: tierlistVersions.id, placements: tierlistVersions.placements })
  .from(tierlistVersions);

for (const { placements } of versions) {
  console.log({
    placements: Object.fromEntries(
      Object.entries(placements).map(([k, v]) => [k, v.map((c) => mapping[c])]),
    ),
  });
}

await db.transaction(async (tx) => {
  for (const { placements, id } of versions) {
    await tx
      .update(tierlistVersions)
      .set({
        placements: Object.fromEntries(
          Object.entries(placements).map(([k, v]) => [
            k,
            v.map((c) => mapping[c]),
          ]),
        ),
      })
      .where(eq(tierlistVersions.id, id));
  }
});
