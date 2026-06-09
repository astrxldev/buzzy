import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Avatar from "@/components/avatar";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getArtifactConfig } from "@/lib/api";
import { db } from "@/lib/db";
import { characters, submissions } from "@/lib/db/schema";
import { CopyButton, EnkaBrowser } from "./client";

export default async function AdminSubmissionView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [sub] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);
  if (!sub) notFound();
  const [char] = await db
    .select()
    .from(characters)
    .where(eq(characters.name, sub?.char || ""))
    .limit(1);
  const { enka } = await getArtifactConfig();
  if (!sub) notFound();
  return (
    <div className="h-full p-2">
      <div className="flex h-full w-full flex-col gap-2">
        <div className="flex w-full justify-between gap-2">
          <Card className="w-full rounded-md pb-1">
            <CardHeader>
              <CardTitle className="font-bold">
                {sub.queue}. {sub.name}
              </CardTitle>
              <CardDescription className="text-white">
                {sub.comment}
              </CardDescription>
            </CardHeader>
            <CardFooter className="h-full items-end">
              <div className="flex items-center">
                <span className="text-gray-500">{sub.uid}</span>
                <CopyButton text={sub.uid} />
              </div>
            </CardFooter>
          </Card>
          <Avatar char={char} />
        </div>
        <div className="h-full overflow-hidden rounded-md border">
          {enka && <EnkaBrowser uid={sub.uid} sub={sub.id} />}
        </div>
      </div>
    </div>
  );
}
