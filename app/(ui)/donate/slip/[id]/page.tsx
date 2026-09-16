import { db } from "@/lib/db";
import type { TUploadKey } from "@/lib/db/schema";
import { slipSync } from "@/lib/db/schema";
import { sse } from "@/lib/db/sse-endpoints";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import z from "zod";
import { PageFileInput } from "./client";
import { FormInput, FormProvider } from "@/components/form";
import { formParse } from "@/components/form-submit";

const Schema = z.object({
  slip: z.file(),
});

export default async function DonateMobileSlipUploadPage({
  params,
}: PageProps<"/donate/slip/[id]">) {
  const { id } = (await params) as { id: TUploadKey };
  const [{ trackingKey } = {}] = await db
    .select({
      trackingKey: slipSync.trackingKey,
    })
    .from(slipSync)
    .where(eq(slipSync.uploadKey, id));
  if (!trackingKey) redirect("/donate");
  sse.slip_sync.pub("connected", trackingKey);
  async function submit(data: FormData) {
    "use server";

    const { $, error } = formParse(Schema, data);
    if (error) return { error };
    const { slip } = $;

    await db
      .update(slipSync)
      .set({
        name: slip.name,
        type: slip.type,
        size: `${slip.size}`,
        data: Buffer.from(await slip.arrayBuffer()),
      })
      .where(eq(slipSync.uploadKey, id));

    sse.slip_sync.pub("complete", trackingKey!);
    redirect("/donate/slip/complete");
  }

  return (
    <FormProvider id={`slip-upload-${id}`} onSubmit={submit} inDialog={false}>
      <FormInput name="slip">
        <PageFileInput />
      </FormInput>
    </FormProvider>
  );
}
