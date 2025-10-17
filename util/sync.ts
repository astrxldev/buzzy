import { inArray } from "drizzle-orm";
import { cdnify, cdnReferences } from "@/lib/api";
import { AmberElementMap } from "@/lib/const";
import { db } from "@/lib/db";
import { cdn, characters, versions } from "@/lib/db/schema";

async function main() {
  console.log("Fetching Amber data...");
  const [changelog, avatars]: [ChangelogApiResponse, AvatarApiResponse] =
    await Promise.all([
      await fetch("https://gi.yatta.moe/api/v2/static/changelog").then((e) =>
        e.json(),
      ),
      await fetch("https://gi.yatta.moe/api/v2/en/avatar").then((e) =>
        e.json(),
      ),
    ]);
  await db.transaction(async (tx) => {
    console.log("Deleting existing versions...");
    await tx.delete(versions);
    console.log("Listing dangling CDN images...");
    const files = await tx.select({ id: cdn.id }).from(cdn);
    const pendingDelete: string[] = [];
    for (const file of files) {
      if ((await cdnReferences(file.id, tx)).length) continue;
      console.log("-", file.id);
      pendingDelete.push(file.id);
    }
    console.log("Deleting dangling CDN images...");
    await tx.delete(cdn).where(inArray(cdn.id, pendingDelete));
    console.log("Creating versions...");
    const amberVersions = Object.entries(changelog.data).filter(
      (v) => "avatar" in v[1].items,
    );
    const createdVersions = await tx
      .insert(versions)
      .values([
        {
          id: "base",
          name: `Base 1.0`,
        },
        ...amberVersions.map(([id, ver], i) => ({
          id,
          name: `Amber ${ver.version}`,
          from: amberVersions[i - 1]?.[0] || "base",
        })),
      ])
      .returning({ id: versions.id })
      .then((v) => v.map((v) => v.id));
    console.log(createdVersions.map((v) => `- ${v}`).join("\n"));
    process.stdout.write("Syncing characters...");
    const total = Object.keys(avatars.data.items).length * 3;
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
    async function handle(char: Avatar, order: number) {
      await tx
        .insert(characters)
        .values({
          amber: char.id.toString(),
          image: await cdnify(
            await fetch(
              `https://gi.yatta.moe/assets/UI/${
                char.icon || "UI_AvatarIcon_PlayerBoy"
              }.png`,
            )
              .then((r) =>
                r.ok
                  ? progress(r)
                  : Promise.reject(
                      new Error(`Failed to fetch image for ${char.name}`),
                    ),
              )
              .then(toFile),
            { tx },
          ).then(progress),
          name: char.name,
          vision: AmberElementMap[char.element],
          stars: char.rank as 4 | 5,
          version:
            amberVersions.find(([, d]) =>
              d.items.avatar
                .map((e) => e.toString())
                .includes(char.id.toString()),
            )?.[0] || "base",
          weapon: char.weaponType,
          order,
        })
        .onConflictDoNothing();
    }
    let i = 0;
    for (const char of Object.values(avatars.data.items)) {
      i += 10;
      process.stdout.write(
        `\rSyncing characters... ${char.name}                                 `,
      );
      pros.push(handle(char, i).then(progress));
    }
    await Promise.all(pros);
    console.log("\nDone!");
  });
}

async function toFile(res: Response) {
  return new File(
    [await res.blob()],
    res.headers
      .get("Content-Disposition")
      ?.match(/^attachment;.*filename="([a-zA-Z0-9-_ .]+)"/)?.[1] ||
      res.url.match(/\/([a-zA-Z0-9-_ .]+)$/)?.[1] ||
      `file.${res.headers.get("Content-Type")?.split("/")[1] || "dat"}`,
  );
}

main();

export interface AvatarApiResponse {
  response: number;
  data: AvatarApiData;
}

export interface AvatarApiData {
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

export interface ChangelogApiResponse {
  response: number;
  data: { [ver: string]: ChangelogVersion };
}

export interface ChangelogVersion {
  items: {
    avatar: Avatar["id"][];
  };
  version: string;
}
