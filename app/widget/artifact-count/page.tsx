// oxlint-disable tailwindcss/no-unknown-classes

import { isNotNull, sql } from "drizzle-orm";
import { Kanit } from "next/font/google";
import { Watcher } from "@/app/(ui)/artifact/admin/client";
import { VersionCheck } from "@/app/client";
import AutoFitText from "@/components/fit";
import { getArtifactConfig } from "@/lib/api";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin", "thai"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
});

export default async function ArtifactCountWidget() {
  const config = await getArtifactConfig();
  const count = await db
    .select({ a: sql`NULL` })
    .from(submissions)
    .where(isNotNull(submissions.queue))
    .then((e) => e.length);

  const display = `${count} / ${config.limit < 0 ? "∞" : config.limit}`;

  return (
    <div
      className={`${kanit.variable} h-screen w-screen font-medium`}
      style={{
        fontFamily: "Kanit",
      }}
    >
      <AutoFitText className="count">{display}</AutoFitText>
      <Watcher />
      <VersionCheck headless />
    </div>
  );
}

export const dynamic = "force-dynamic";
