import { formatDistanceToNow } from "date-fns";
import { not } from "drizzle-orm";
import { removeExpiredSubmissions } from "@/app/(ui)/rubgram/api";
import { db } from "@/lib/db";
import { artifactSettings, endgameSubmissions } from "@/lib/db/schema";

Bun.serve({
  fetch(req, server) {
    return new Response("Hello world2");
  },
});
console.log("Listening");

function logger(group: string) {
  const prefix = `[${group}]`;
  return {
    // biome-ignore lint/suspicious/noExplicitAny: logger
    log(...args: any[]) {
      console.log(prefix, ...args);
    },
    // biome-ignore lint/suspicious/noExplicitAny: logger
    error(...args: any[]) {
      console.error(prefix, ...args);
    },
    schedule(target: Date[] | number, callback: () => void) {
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
      console.log(
        prefix,
        `Running ${formatDistanceToNow(new Date(now + timeout), { addSuffix: true })}`,
      );
      return setTimeout(callback, timeout);
    },
  };
}

async function checkRubgramExpiration() {
  const { log, error, schedule } = logger("rubgramExpiration");
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

async function mockData() {
  if (process.env.NODE_ENV !== "development") return;
  const { log, error, schedule } = logger("mockData");
  const res = await db.select().from(artifactSettings);
  if (res.length) return;
  // schema isn't there yet
  log("Setting up database schema");
}

checkRubgramExpiration();

process.on(15 as unknown as "SIGTERM", process.exit);
