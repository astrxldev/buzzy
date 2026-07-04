import { readFile } from "node:fs/promises";
import { inArray } from "drizzle-orm";
import { cdnify, checkCdnRefs } from "@/lib/api";
import { AmberElementMap } from "@/lib/const";
import { db } from "@/lib/db";
import { cdn, characters, versions } from "@/lib/db/schema";

const exclude = ["Traveler", "Manekin", "Manekina"];
const extra: Avatar[] = [
  {
    id: "10000005-pyro",
    rank: 5,
    name: "Traveler Pyro",
    element: "Fire",
    weaponType: "WEAPON_SWORD_ONE_HAND",
    region: "MAINACTOR",
    specialProp: "FIGHT_PROP_ATTACK_PERCENT",
    bodyType: "BOY",
    icon: "custom/traveler_pyro.webp:image/webp",
    birthday: [0, 0],
    route: "Pyro Traveler Boy",
    release: 1735758000,
  },
  {
    id: "10000005-hydro",
    rank: 5,
    name: "Traveler Hydro",
    element: "Water",
    weaponType: "WEAPON_SWORD_ONE_HAND",
    region: "MAINACTOR",
    specialProp: "FIGHT_PROP_ATTACK_PERCENT",
    bodyType: "BOY",
    icon: "custom/traveler_hydro.webp:image/webp",
    birthday: [0, 0],
    route: "Hydro Traveler Boy",
    release: 1690146000,
  },
  {
    id: "10000005-anemo",
    rank: 5,
    name: "Traveler Anemo",
    element: "Wind",
    weaponType: "WEAPON_SWORD_ONE_HAND",
    region: "MAINACTOR",
    specialProp: "FIGHT_PROP_ATTACK_PERCENT",
    bodyType: "BOY",
    icon: "custom/traveler_anemo.webp:image/webp",
    birthday: [0, 0],
    route: "Anemo Traveler Boy",
    release: 1601244000,
  },
  {
    id: "10000005-geo",
    rank: 5,
    name: "Traveler Geo",
    element: "Rock",
    weaponType: "WEAPON_SWORD_ONE_HAND",
    region: "MAINACTOR",
    specialProp: "FIGHT_PROP_ATTACK_PERCENT",
    bodyType: "BOY",
    icon: "custom/traveler_geo.webp:image/webp",
    birthday: [0, 0],
    route: "Geo Traveler Boy",
    release: 1601244000,
  },
  {
    id: "10000005-electro",
    rank: 5,
    name: "Traveler Electro",
    element: "Electric",
    weaponType: "WEAPON_SWORD_ONE_HAND",
    region: "MAINACTOR",
    specialProp: "FIGHT_PROP_ATTACK_PERCENT",
    bodyType: "BOY",
    icon: "custom/traveler_electro.webp:image/webp",
    birthday: [0, 0],
    route: "Electro Traveler Boy",
    release: 1626814800,
  },
  {
    id: "10000005-dendro",
    rank: 5,
    name: "Traveler Dendro",
    element: "Grass",
    weaponType: "WEAPON_SWORD_ONE_HAND",
    region: "MAINACTOR",
    specialProp: "FIGHT_PROP_ATTACK_PERCENT",
    bodyType: "BOY",
    icon: "custom/traveler_dendro.webp:image/webp",
    birthday: [0, 0],
    route: "Dendro Traveler Boy",
    release: 1657659600,
  },
];

async function main() {
  console.log("Fetching Amber data...");
  const [changelog, avatars]: [ChangelogApiResponse, AvatarApiResponse] =
    await Promise.all([
      await fetch("https://buzz.sudloh.com/api/amber/log").then((e) =>
        e.json(),
      ),
      await fetch("https://buzz.sudloh.com/api/amber/char").then((e) =>
        e.json(),
      ),
    ]);
  await db.transaction(async (tx) => {
    // console.log("Deleting existing versions...");
    // await tx.delete(versions);
    console.log("Creating new versions...");
    const amberVersions = Object.entries(changelog.data).filter(
      (v) => "avatar" in v[1].items,
    );
    const existingVersions = (await tx.select().from(versions)).map(
      (v) => v.id,
    );
    const newVersions = [
      {
        id: "base",
        name: `Base 1.0`,
      },
      ...amberVersions.map(([id, ver], i) => ({
        id,
        name: `Amber ${ver.version}`,
        from: amberVersions[i - 1]?.[0] || "base",
      })),
    ].filter((v) => !existingVersions.includes(v.id));
    const createdVersions = newVersions.length
      ? await tx
          .insert(versions)
          .values(newVersions)
          .returning({ id: versions.id })
          .then((v) => v.map((v) => v.id))
      : [];
    console.log(
      createdVersions.map((v) => `- ${v}`).join("\n") || "- None created.",
    );
    process.stdout.write("Calculating characters... ");
    const existingChars = await tx
      .select({ name: characters.name })
      .from(characters)
      .then((l) => l.map((c) => c.name));
    existingChars.push(...exclude);
    const newChars = [...Object.values(avatars.data.items), ...extra].filter(
      (c) => !existingChars.includes(c.name),
    );
    process.stdout.write(
      `${newChars.length} new characters to be added.\nSyncing characters...`,
    );
    const total = Object.keys(newChars).length;
    var done = 0;
    const pros = [];
    function progress<K>(p: K): K {
      done += 1 / 3;
      process.stdout.write(
        `\rSyncing characters... ${Math.round(done)}/${total} (${Math.floor(
          (done / total) * 100,
        )}%)`,
      );
      return p;
    }
    async function handle(char: Avatar, order: number) {
      const customFile = char.icon.match(customImageRegex);
      await tx
        .insert(characters)
        .values({
          amber: char.id.toString(),
          image: await cdnify(
            customFile
              ? new Blob(
                  [
                    new Uint8Array(
                      await readFile(`${__dirname}/img/${customFile[1]}`).then(
                        progress,
                      ),
                    ),
                  ],
                  {
                    type: customFile[2] || "image/png",
                  },
                )
              : await fetch(
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
            { tx, name: customFile?.[1] },
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
          id: char.name.toLowerCase().replace(/ /g, "_"),
        })
        .onConflictDoNothing();
    }
    let i = 0;
    for (const char of newChars) {
      i += 10;
      process.stdout.write(
        `\rSyncing characters... ${char.name}                                 `,
      );
      pros.push(handle(char, i).then(progress));
    }
    await Promise.all(pros);

    console.log("\nListing dangling CDN images...");
    const files = await tx.select({ id: cdn.id }).from(cdn);
    const pendingDelete: string[] = [];
    for (const file of files) {
      if ((await checkCdnRefs(file.id, tx)).length) continue;
      console.log("-", file.id);
      pendingDelete.push(file.id);
    }
    if (!pendingDelete.length) console.log("- Found none.");
    console.log("Deleting dangling CDN images...");
    await tx.delete(cdn).where(inArray(cdn.id, pendingDelete));

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

const customImageRegex = /^custom\/([a-z0-9_.-]+)(?::([a-z]+\/[a-z]+))/im;

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
