import { PlusIcon } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import z from "zod";
import { FormAction, FormInput, FormProvider } from "@/components/form";
import { ModalBase } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { actionLog } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { formParse } from "@/components/form-submit";
import { sse } from "@/lib/db/sse-endpoints";

const Schema = z.object({
  goal: z.coerce.number().nonnegative().nullable().optional().default(null),
});

export default async function RgManualCreateModal() {
  if (!(await adminCheck())) redirect("/login");
  const [{ donateGoal }] = await db
    .select({ donateGoal: settings.donateGoal })
    .from(settings);
  async function submit(form: FormData) {
    "use server";
    if (!(await adminCheck())) redirect("/login");

    const { $, error } = formParse(Schema, form);
    if (error) return { error };

    await db
      .insert(settings)
      .values({ donateGoal: $.goal })
      .onConflictDoUpdate({
        target: settings.id,
        set: { donateGoal: $.goal },
      });

    await actionLog(`Donate goal set to ${$.goal}`);

    revalidatePath("/donate/admin");
    sse.donate.pub("update", null);

    return { toast: `Donate goal set to ${$.goal}`, close: true };
  }

  return (
    <ModalBase title="Set Goal">
      <FormProvider id="goal-set" onSubmit={submit}>
        <FormInput name="goal" label="Price">
          <Input
            placeholder="0"
            type="number"
            defaultValue={donateGoal ?? ""}
          />
        </FormInput>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button asChild>
            <FormAction
              type="submit"
              loading={
                <>
                  <Spinner />
                  Setting...
                </>
              }
            >
              <PlusIcon />
              Set
            </FormAction>
          </Button>
        </DialogFooter>
      </FormProvider>
    </ModalBase>
  );
}

export const dynamic = "force-dynamic";
