import { YAML } from "bun";
import { and, eq, getTableColumns } from "drizzle-orm";
import { ReceiptText } from "lucide-react";
import { calcPrice } from "@/app/(ui)/rubgram/api";
import Image from "@/components/image";
import { DiscordMentionable } from "@/components/mentionable";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { db } from "@/lib/db";
import { endgameArchive, endgameDiscord, endgameSlips } from "@/lib/db/schema";
import { parseSearchNumber } from "@/lib/utils";
import { DataViewer } from "./client";

export default async function ({
  params,
}: PageProps<"/rubgram/admin/slip/[round]/[queue]">) {
  const { round: r, queue: q } = await params;
  const round = parseSearchNumber(r) || 1;
  const queue = parseSearchNumber(q) || 1;
  const { slip, ...slipColumns } = getTableColumns(endgameSlips);
  const [entry] = await db
    .select({
      ...getTableColumns(endgameArchive),
      user: getTableColumns(endgameDiscord),
      slip: slipColumns,
    })
    .from(endgameArchive)
    .where(
      and(eq(endgameArchive.round, round), eq(endgameArchive.queue, queue)),
    )
    .innerJoin(endgameDiscord, eq(endgameDiscord.uid, endgameArchive.user))
    .leftJoin(endgameSlips, eq(endgameSlips.id, endgameArchive.slip))
    .limit(1);

  const entryYaml = YAML.stringify(
    { ...entry, slip: { ...entry.slip, data: undefined } },
    null,
    2,
  );
  const slipYaml = YAML.stringify(entry.slip, null, 2);

  if (!entry)
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

  return (
    <div className="flex flex-col sm:flex-row h-full p-2">
      <div className="flex flex-1 justify-center items-center p-5">
        <div className="relative rounded border border-dashed border-white">
          <Image
            src={`/api/slip/${entry.slip?.id}`}
            alt="Slip"
            className="object-contain"
            width={1000}
            height={1000}
          />
          <div className="absolute top-0 left-0 bottom-0 right-0 backdrop-blur-lg hover:opacity-0 transition-opacity" />
        </div>
      </div>
      <div className="flex justify-center items-center flex-1">
        <Card>
          <CardHeader>
            <CardTitle>จ่าย {entry.price} บาท</CardTitle>
            <CardDescription>
              {entry.service.join(", ")} (รวม {calcPrice(entry.service)} บาท)
            </CardDescription>
            <CardAction>
              <DiscordMentionable
                id={entry.user.uid}
                name={entry.user.display}
                type="user"
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            <DataViewer {...{ entryYaml, slipYaml }} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
