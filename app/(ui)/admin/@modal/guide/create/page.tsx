import { sql } from "drizzle-orm";
import { PlusIcon } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TypedFormData } from "@/app/(ui)/rubgram/type";
import { CdnChooser } from "@/components/chooser";
import {
  FormAction,
  FormInput,
  FormProvider,
  FormRow,
} from "@/components/form";
import { ModalBase } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { actionLog } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { guides } from "@/lib/db/schema";

export default async function GuideCreatePage() {
  const [{ maxOrder }] = await db
    .select({
      maxOrder: sql<number>`
      MAX(${guides.order})`,
    })
    .from(guides);
  async function submit(
    form: TypedFormData<{
      name: string;
      link: string;
      image: string;
      order: string;
    }>,
  ) {
    "use server";
    if (!(await adminCheck())) redirect("/login");

    for (const field of ["name", "link"] as const) {
      if (!form.get(field)) {
        return { error: `Field "${field}" is required.` };
      }
    }

    let data: typeof guides.$inferInsert;

    try {
      data = {
        name: form.get("name")!,
        image: form.get("image")!,
        link: form.get("link")!,
        order: parseInt(form.get("order")!, 10),
      };
      try {
        new URL(data.link);
      } catch {
        return { error: "Invalid link." };
      }
      await db.insert(guides).values(data);
    } catch (e) {
      console.error(e);
      const err = e as Error & { cause: { detail: string; message: string } };
      return {
        error:
          err?.cause?.detail || err?.cause?.message || "Failed to add guide.",
      };
    }

    await actionLog(`Added guide ${data.name}`, data);

    revalidatePath("/admin/guide");
    return { toast: "Guide added successfully.", close: true };
  }

  return (
    <ModalBase title="Add Guide">
      <FormProvider id="guide-create" onSubmit={submit}>
        <FormRow>
          <FormInput name="name" label="Name">
            <Input placeholder="[6.3] Flins Guide" autoFocus />
          </FormInput>
          <FormInput name="order" label="Order">
            <Input
              placeholder={`${maxOrder + 10}`}
              defaultValue={maxOrder + 10}
            />
          </FormInput>
        </FormRow>
        <FormInput name="link" label="Link">
          <Input placeholder="https://docs.google.com/spreadsheets/..." />
        </FormInput>
        <FormInput name="image" label="Image" subLabel="optional">
          <CdnChooser />
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
                  Creating...
                </>
              }
            >
              <PlusIcon />
              Create
            </FormAction>
          </Button>
        </DialogFooter>
      </FormProvider>
    </ModalBase>
  );
}
