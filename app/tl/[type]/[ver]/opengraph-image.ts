import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { tierlistTypes, tierlistVersions } from "@/lib/db/schema";
import generate from "@/lib/og";

// Image metadata
export const size = {
  width: 1222,
  height: 560,
};

export const contentType = "image/png";

// Image generation
export default async function Image({
  params,
}: {
  params: Promise<{ type: string; ver: string }>;
}) {
  const { type, ver } = await params;
  const [version] = await db
    .select({ name: tierlistVersions.name })
    .from(tierlistVersions)
    .where(and(eq(tierlistVersions.id, ver), eq(tierlistVersions.type, type)));
  if (!version) notFound();
  const [tlType] = await db
    .select()
    .from(tierlistTypes)
    .where(eq(tierlistTypes.id, type));
  return generate({
    title: `เทียร์ลิสต์ ${tlType.name}`,
    sub: `เวอร์ชั่น ${version.name}`,
  });
}
