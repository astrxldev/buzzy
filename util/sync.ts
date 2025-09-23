import { AmberElementMap } from "@/lib/const";
import { db } from "@/lib/db";
import { cdn, characters, versions } from "@/lib/db/schema";

async function main() {
  console.log("Fetching Amber data...");
  const data: AvatarApiResponse = await fetch(
    "https://gi.yatta.moe/api/v2/en/avatar",
  ).then((e) => e.json());
  await db.transaction(async (tx) => {
    console.log("Cleaning up...");
    await tx.delete(characters);
    await tx.delete(cdn);
    await tx.delete(versions);
    console.log("Creating base version...");
    const [{ id: version }] = await tx
      .insert(versions)
      .values({
        id: "b10",
        name: "Base 1.0",
      })
      .returning({ id: versions.id });
    process.stdout.write("Syncing characters...");
    const total = Object.keys(data.data.items).length * 3;
    var done = 0;
    const pros = [];
    function progress<K>(p: K): K {
      done++;
      process.stdout.write(
        `\rSyncing characters... ${done}/${total} (${Math.floor(
          (done / total) * 100,
        )}%)`,
      );
      return p;
    }
    async function handle(char: Avatar) {
      await tx
        .insert(characters)
        .values({
          amber: char.id.toString(),
          image: await cdnify(
            await fetch(
              `https://gi.yatta.moe/assets/UI/${
                char.icon || "UI_AvatarIcon_PlayerBoy"
              }.png`,
            ).then((r) =>
              r.ok
                ? progress(r.blob())
                : Promise.reject(
                    new Error(`Failed to fetch image for ${char.name}`),
                  ),
            ),
          ).then(progress),
          name: char.name,
          vision: AmberElementMap[char.element],
          stars: char.rank as 4 | 5,
          version,
          weapon: char.weaponType,
        })
        .onConflictDoNothing();
    }
    for (const char of Object.values(data.data.items)) {
      process.stdout.write(
        `\rSyncing characters... ${char.name}                                 `,
      );
      pros.push(handle(char).then(progress));
    }
    await Promise.all(pros);
    console.log("\nDone!");
  });
}

async function cdnify(data: Blob, tx = db) {
  const [{ id }] = await tx
    .insert(cdn)
    .values({
      data: Buffer.from(await data.arrayBuffer()),
      size: `${data.size}`,
      type: data.type,
    })
    .returning({ id: cdn.id });
  return id;
}

main();

export interface AvatarApiResponse {
  response: number;
  data: Data;
}

export interface Data {
  props: { [key: string]: string };
  types: { [key: string]: string };
  items: { [key: string]: Avatar };
}

export interface Avatar {
  id: number | string;
  rank: number;
  name: string;
  element: string;
  weaponType: string;
  region: string;
  specialProp: string;
  bodyType: string;
  icon: string;
  birthday: number[];
  release: number;
  route: string;
}
