import { asc, desc, sql } from "drizzle-orm";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import { fileToDataUrl } from "@/lib/utils";
import { Podium } from "./podium";
import { TopDonateTable } from "./table";
import type { Metadata } from "next";

type NumberString = `${number}`;
type NumberLike = number | NumberString;

export const metadata: Metadata = {
  title: "โดเนทขึ้นจอ",
  description: "ท็อป 10 อันดับคนโดเนท",
};

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="flex min-h-svh flex-col justify-center">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
        <div className="mt-6 flex items-end justify-center gap-4">
          <Skeleton className="h-36 w-36 rounded-xl" />
          <Skeleton className="h-48 w-36 rounded-xl" />
          <Skeleton className="h-32 w-36 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

async function Content() {
  const list = await db
    .select({
      i: sql<NumberLike>`ROW_NUMBER() OVER
        (ORDER BY ${desc(donations.amount)}, ${asc(donations.id)})`,
      name: donations.name,
      amount: donations.amount,
    })
    .from(donations)
    .offset(3)
    .limit(7)
    .orderBy(desc(donations.amount), asc(donations.id));

  const podium = await db
    .select({
      name: donations.name,
      amount: donations.amount,
      image: donations.image,
    })
    .from(donations)
    .limit(3)
    .orderBy(desc(donations.amount), asc(donations.id))
    .then((r) =>
      Promise.all(
        r.map(async (d) => ({
          ...d,
          image: d.image
            ? await fileToDataUrl(new File([Buffer.from(d.image)], "image.jpg"))
            : undefined,
        })),
      ),
    );

  return (
    <div className="flex min-h-svh flex-col justify-center">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4">
        <Podium data={podium} />
        <TopDonateTable data={list} />
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
