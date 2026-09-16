import { sql } from "drizzle-orm";
import { PlusIcon } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import { tierlistColumns } from "@/lib/db/schema";

export default async function TlLayoutColumnCreatePage() {
  if (!(await adminCheck())) redirect("/login");

  const [{ maxOrder }] = await db
    .select({
      maxOrder: sql<number>`COALESCE(MAX(${tierlistColumns.order}), 0)`,
    })
    .from(tierlistColumns);

  async function submit(form: FormData) {
    "use server";
    if (!(await adminCheck())) redirect("/login");

    for (const field of ["id", "name", "order"] as const) {
      if (!form.get(field)) return { error: `Field "${field}" is required.` };
    }

    let data: typeof tierlistColumns.$inferInsert;

    try {
      data = {
        id: form.get("id") as string,
        name: form.get("name") as string,
        image: (form.get("image") as string) || null,
        order: parseInt(form.get("order") as string, 10),
      };
      await db.insert(tierlistColumns).values(data);
    } catch (error) {
      console.error(error);
      const err = error as Error & {
        cause?: { detail?: string; message?: string };
      };
      return {
        error:
          err?.cause?.detail ||
          err?.cause?.message ||
          "Failed to create column.",
      };
    }

    await actionLog(`Created tierlist column ${data.id}`, data);

    revalidatePath("/admin/tl/layout");
    revalidatePath("/tl");
    return { toast: "Column created successfully.", close: true };
  }

  return (
    <ModalBase title="Create Column">
      <FormProvider id="tl-layout-column-create" onSubmit={submit}>
        <FormRow>
          <FormInput name="name" label="Name">
            <Input placeholder="Support" autoFocus />
          </FormInput>
          <FormInput name="id" label="ID">
            <Input placeholder="sup" />
          </FormInput>
        </FormRow>
        <FormInput name="order" label="Order">
          <Input placeholder="10" defaultValue={(maxOrder ?? 0) + 10} />
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
                  Saving...
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

export const dynamic = "force-dynamic";
