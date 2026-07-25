import { asc, desc, max, ne, sql, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const [list, podiumRows] = await Promise.all([
    db
      .select({
        i: sql<number>`ROW_NUMBER() OVER (ORDER BY ${desc(sum(donations.amount))}, ${asc(max(donations.id))})`,
        name: donations.name,
        amount: sum(donations.amount),
      })
      .from(donations)
      .where(ne(donations.name, "Anonymous"))
      .offset(3)
      .limit(7)
      .groupBy(donations.name)
      .orderBy(desc(sum(donations.amount)), asc(max(donations.id))),
    db
      .select({
        name: donations.name,
        amount: sum(donations.amount),
        image: sql<Buffer | null>`(array_agg(${donations.image} ORDER BY ${donations.id} DESC))[1]`,
      })
      .from(donations)
      .where(ne(donations.name, "Anonymous"))
      .groupBy(donations.name)
      .orderBy(desc(sum(donations.amount)), asc(max(donations.id)))
      .limit(3),
  ]);

  return {
    list,
    podium: podiumRows.map((row) => ({
      ...row,
      image: row.image ? `data:image/jpeg;base64,${Buffer.from(row.image).toString("base64")}` : undefined,
    })),
  };
};
