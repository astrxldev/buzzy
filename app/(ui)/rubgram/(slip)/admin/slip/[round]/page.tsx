import { eq } from "drizzle-orm";
import { ReceiptText } from "lucide-react";
import { redirect } from "next/navigation";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { db } from "@/lib/db";
import { endgameArchive } from "@/lib/db/schema";
import { parseParamNumber } from "@/lib/utils";

export default async function ({
  params,
}: {
  params: Promise<{ round: string }>;
}) {
  const { round: r } = await params;
  const round = parseParamNumber(r) || 1;
  const [first] = await db
    .select({ queue: endgameArchive.queue })
    .from(endgameArchive)
    .where(eq(endgameArchive.round, round))
    .orderBy(endgameArchive.queue)
    .limit(1);
  if (first) redirect(`/rubgram/admin/slip/${round}/${first.queue}`);

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ReceiptText />
        </EmptyMedia>
        <EmptyTitle>ยังไม่มีสลิป</EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}
