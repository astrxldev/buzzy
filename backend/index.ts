import { env } from "node:process";
import { formatDistanceToNow } from "date-fns";
import { and, asc, eq, isNull, lt, not, sql } from "drizzle-orm";
import { removeExpiredSubmissions } from "@/app/(ui)/rubgram/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  artifactSettings,
  cards,
  endgameSettings,
  endgameSubmissions,
  endgameTypes,
  settings,
  submissions,
  tierlistColumns,
  tierlistTiers,
  user,
} from "@/lib/db/schema";

function logger(group: string) {
  const prefix = `[${group}]`;
  const t = {
    // biome-ignore lint/suspicious/noExplicitAny: logger
    log(...args: any[]) {
      console.log(prefix, ...args);
    },
    // biome-ignore lint/suspicious/noExplicitAny: logger
    error(...args: any[]) {
      console.error(prefix, ...args);
    },
    schedule(target: Date[] | number, callback: () => Promise<void> | void) {
      let timeout: number;
      const now = Date.now();
      // conv sec to milli
      if (typeof target === "number") timeout = target * 1000;
      // find nearest date, poll 60s if no date
      else
        timeout = target.length
          ? target
              .map((d) => d.getTime() - now)
              .reduce((a, b) => Math.min(a, b), 0)
          : 60000;
      if (typeof target === "number" || target.length)
        console.log(
          prefix,
          `Running ${formatDistanceToNow(new Date(now + timeout), { addSuffix: true })}`,
        );
      return setTimeout(
        () =>
          callback()?.catch((e) => {
            t.error(e);
            t.schedule(300, callback);
          }),
        timeout,
      );
    },
  };
  return t;
}

async function checkRubgramExpiration() {
  const { log, schedule } = logger("rubgramExpiration");
  const { removed } = await removeExpiredSubmissions();
  if (removed) log("Purged", removed, "submissions");

  const expirable = await db
    .select({ expires: endgameSubmissions.expires })
    .from(endgameSubmissions)
    .where(not(endgameSubmissions.paid));
  schedule(
    expirable.map((e) => e.expires).filter((x): x is Date => !!x),
    checkRubgramExpiration,
  );
}

async function seedDatabase() {
  if (process.env.ENVIRONMENT !== "development") return;
  const { log, error } = logger("seeding");
  try {
    const res = await db.select().from(artifactSettings);
    if (res.length) return;
  } catch {
    // schema isn't there yet
    error("Schema is not applied or not updated, skipping database seeding");
    return;
  }
  log("Setting up database schema");
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, "admin@dgnr.us"));
  if (existing) log("Admin account already exist, skipping creation");
  else if (env.INITIAL_ADMIN_PWD) {
    const u = await auth.api.signUpEmail({
      body: {
        name: "Admin",
        email: "admin@dgnr.us",
        password: env.INITIAL_ADMIN_PWD,
      },
    });
    await db
      .update(user)
      .set({
        role: "admin",
      })
      .where(eq(user.id, u.user.id));
    log(
      "User admin@dgnr.us created successfully with INITIAL_ADMIN_PWD password",
    );
  } else
    return error("INITIAL_ADMIN_PWD not specified, skipping database seeding");
  log("Transaction BEGIN");
  await db.transaction(async (tx) => {
    log("Creating default Global Settings");
    await tx.insert(settings).values({
      id: true,
      enka: true,
    });
    log("Creating default Artifact Settings");
    await tx.insert(artifactSettings).values({
      id: true,
      limit: -1,
      locked: true,
    });
    log("Creating default Endgame Settings");
    await tx.insert(endgameSettings).values({
      id: true,
      limit: -1,
      locked: true,
      allDiscount: 10,
      free: 2,
    });
    await tx.insert(endgameTypes).values([
      { id: "abyss", display: "Spiral Abyss (อบิส)", price: 60, order: 1 },
      { id: "theater", display: "โรงละครในจินตนาการ", price: 100, order: 2 },
      {
        id: "stygian",
        display: "Stygian Onslaught (ศึกเดือดแดนเร้นลับ)",
        price: 100,
        order: 3,
      },
      {
        id: "stygian1rm",
        display: "ลง 1 ห้อง (Stygian Onslaught)",
        price: 35,
        order: 4,
      },
    ]);
    log("Creating default Tierlist layout");
    await tx.insert(tierlistTiers).values([
      {
        id: "p",
        name: "SS",
        order: 10,
        badges: ["sss", "ssp", "ssm"],
      },
      {
        id: "s",
        name: "S",
        order: 20,
        badges: ["sp", "sm"],
      },
      {
        id: "a",
        name: "A",
        order: 30,
        badges: ["ap", "am"],
      },
      {
        id: "b",
        name: "B",
        order: 40,
        badges: ["bp", "bm"],
      },
      {
        id: "c",
        name: "C",
        order: 50,
        badges: ["cp", "cm"],
      },
    ]);
    await tx.insert(tierlistColumns).values([
      {
        id: "nd",
        name: "On-Field DPS",
        order: 10,
      },
      {
        id: "fd",
        name: "Off-Field DPS",
        order: 20,
      },
      {
        id: "s",
        name: "Support",
        order: 30,
      },
    ]);
  });
  log("Database seeding complete");
}

async function cacheCards() {
  const { log, schedule } = logger("cacheCards");
  const [notCached] = await db
    .select({
      id: submissions.id,
    })
    .from(submissions)
    .leftJoin(cards, eq(cards.submission, submissions.id))
    .where(
      and(
        eq(submissions.checked, false),
        isNull(cards.image),
        lt(sql<number>`coalesce(${cards.tries}, 0)`, 20),
      ),
    )
    .orderBy(
      asc(submissions.queue),
      asc(sql`coalesce(${cards.tries}, 0)`),
      asc(submissions.id),
    )
    .limit(1);
  if (!notCached) {
    schedule([], cacheCards);
    return;
  }
  log(`Generating card for ${notCached.id}`);
  const res = await fetch(`http://app:3000/api/card/${notCached.id}`);
  if (!res.ok) {
    log(`Wasn't okay, queueing for retry.`);
    await db
      .insert(cards)
      .values({
        submission: notCached.id,
        tries: 1,
      })
      .onConflictDoUpdate({
        target: cards.submission,
        set: {
          tries: res.status === 400 ? 20 : sql<number>`${cards.tries} + 1`,
        },
      });
    schedule(60, cacheCards);
  } else schedule(120, cacheCards);
}

checkRubgramExpiration();
seedDatabase();
cacheCards();
console.log("Tasks assigned");

process.on(15 as unknown as "SIGTERM", process.exit);
