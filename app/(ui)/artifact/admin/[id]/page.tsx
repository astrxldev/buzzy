import { eq } from "drizzle-orm";
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
  const [char] = await db
    .select()
    .from(characters)
    .where(eq(characters.name, sub?.char || ""))
    .limit(1);
  const { enka } = await getArtifactConfig();
  return (
    <div className="p-2 h-full">
      <div className="flex flex-col h-full w-full gap-2">
        <div className="flex w-full justify-between gap-2">
          <Card className="w-full pb-1 rounded-md">
            <CardHeader>
              <CardTitle>
                {sub.queue}. {sub.name}
              </CardTitle>
              <CardDescription>{sub.comment}</CardDescription>
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
        <div className="border rounded-md h-full overflow-hidden">
          {enka && (
            <EnkaBrowser uid={sub?.uid || ""} cidAmber={char?.amber || ""} />
          )}
        </div>
      </div>
    </div>
  );
}
