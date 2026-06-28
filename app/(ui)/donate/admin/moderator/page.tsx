import { adminCheck } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DonateWatcher } from "../client";
import { db } from "@/lib/db";
import { donations } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Gavel, ImageOff, RefreshCw } from "lucide-react";
import { fileToDataUrl } from "@/lib/utils";
import Image from "@/components/image";
import { Spinner } from "@/components/ui/spinner";
import { ActionButton } from "@/components/action-button";
import { reloadWidget } from "../api";
import { markDone } from "@/app/widget/donate/api";
import { ClientTracker, PIP } from "./client";

export default async function DonateModeratorPage() {
  if (!(await adminCheck()))
    redirect(`/login?next=${encodeURIComponent("/donate/admin/moderator")}`);

  const [sub] = await db
    .select()
    .from(donations)
    .orderBy(desc(donations.created))
    // .where(isNotNull(donations.image))
    .limit(1);

  async function reject() {
    "use server";
    markDone(sub.id);
    reloadWidget();
  }

  return (
    <PIP width={400} height={600}>
      <div className="dark flex w-full max-w-100 flex-col gap-1 bg-background p-1 text-foreground scheme-dark">
        <span>Donate Moderator</span>
        {sub.image ? (
          <div className="relative flex aspect-square w-full max-w-100 items-center justify-center overflow-hidden rounded-lg border bg-black/50">
            <Image
              src={await fileToDataUrl(
                new File([Buffer.from(sub.image)], "abc.jpeg"),
              )}
              alt="donation image"
              fill
              className="z-10"
            />
            <Spinner className="size-16" />
          </div>
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-lg border bg-black/50">
            <ImageOff className="size-16 opacity-20" />
          </div>
        )}
        <div className="flex justify-between">
          <div className="flex flex-col">
            <span className="font-bold">{sub.name}</span>
            <span>{sub.message}</span>
          </div>
          <span className="font-semibold">{sub.amount}฿</span>
        </div>
        <div className="flex flex-wrap justify-evenly gap-1">
          <ActionButton action={reject} variant="destructive" size="sm">
            <Gavel /> Reject
          </ActionButton>
          <ActionButton action={reloadWidget} variant="outline" size="sm">
            <RefreshCw /> Reload Widgets
          </ActionButton>
          <ClientTracker />
        </div>
        <DonateWatcher sfx />
      </div>
    </PIP>
  );
}
