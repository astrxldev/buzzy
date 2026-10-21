import { sql } from "drizzle-orm";
import type { tierlistStates } from "./db/schema";
import type { TierlistWriteResult } from "./tierlist-sync";

type StateInput = Partial<typeof tierlistStates.$inferInsert>;
type StateRow = typeof tierlistStates.$inferSelect;

export function validateTierlistStateInput(data: StateInput) {
  const { list, ref, uuid } = data;
  if (typeof list !== "string" || !list.trim())
    throw new Error("A tierlist version is required.");
  if (typeof ref !== "string" || !ref.trim())
    throw new Error("A tierlist state reference is required.");
  if (
    uuid !== undefined &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      uuid,
    )
  )
    throw new Error("A valid tierlist state UUID is required.");
  return { list, ref };
}

export function resolveTierlistStateTarget(
  byUuid: StateRow | undefined,
  byRef: StateRow | undefined,
  list: string,
) {
  if (byUuid && byUuid.list !== list)
    throw new Error("Tierlist state UUID belongs to another version.");
  if (byUuid && byRef && byUuid.ref === byRef.ref) return byRef;
  return byUuid ?? byRef;
}

type TransactionLike = {
  execute(query: ReturnType<typeof sql>): Promise<unknown>;
};

export async function lockTierlistList(tx: TransactionLike, list: string) {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${list}, 0))`,
  );
}

export function normalizeTierlistPlacements(
  placements: Record<string, string[]>,
) {
  const { untiered: _untiered, ...persistedPlacements } =
    structuredClone(placements);
  return persistedPlacements;
}

export async function finishTierlistWrite<T>({
  list,
  operation,
  data,
  audit,
  publish,
  revalidate,
}: {
  list: string;
  operation: "state" | "placements";
  data: T;
  audit: () => Promise<unknown>;
  publish: () => Promise<unknown>;
  revalidate: () => void;
}): Promise<TierlistWriteResult<T>> {
  try {
    revalidate();
  } catch (error) {
    logTierlistPostCommitFailure(list, operation, "revalidation", error);
  }
  try {
    await audit();
  } catch (error) {
    logTierlistPostCommitFailure(list, operation, "audit", error);
  }

  let publication: TierlistWriteResult<T>["publication"] = "sent";
  try {
    await publish();
  } catch (error) {
    publication = "failed";
    logTierlistPostCommitFailure(list, operation, "publication", error);
  }
  return { persisted: true, data, publication };
}

function logTierlistPostCommitFailure(
  list: string,
  operation: string,
  step: string,
  error: unknown,
) {
  console.error(
    `Tierlist ${operation} post-commit ${step} failed for ${list} (${error instanceof Error ? error.name : "unknown error"}).`,
  );
}
