import { Kanit } from "next/font/google";
import { Watcher } from "@/app/(ui)/artifact/admin/client";
import { VersionCheck } from "@/app/client";
import AutoFitText from "@/components/fit";
import { getArtifactConfig } from "@/lib/api";
import { db } from "@/lib/db";
import { endgameSubmissions } from "@/lib/db/schema";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin", "thai"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
});

export default async function ArtifactCountWidget() {
  const config = await getArtifactConfig();
  const count = await db.$count(endgameSubmissions);

  const display = `${count} / ${config.limit < 0 ? "∞" : config.limit}`;

  return (
    <div
      className={`${kanit.variable} w-screen h-screen font-medium`}
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
