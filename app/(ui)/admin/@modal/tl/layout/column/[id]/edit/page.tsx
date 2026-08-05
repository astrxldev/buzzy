import { eq } from "drizzle-orm";
import { SaveIcon, Trash2 } from "lucide-react";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
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

export default async function TlLayoutColumnEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await adminCheck())) redirect("/login");

  const { id } = await params;
  const [column] = await db
    .select()
    .from(tierlistColumns)
    .where(eq(tierlistColumns.id, id));
  if (!column) notFound();

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
      await db
        .update(tierlistColumns)
        .set(data)
        .where(eq(tierlistColumns.id, id));
    } catch (error) {
      console.error(error);
      const err = error as Error & {
        cause?: { detail?: string; message?: string };
      };
      return {
        error:
          err?.cause?.detail ||
          err?.cause?.message ||
          "Failed to update column.",
      };
    }

    await actionLog(`Updated tierlist column ${id}`, data);

    revalidatePath("/admin/tl/layout");
    revalidatePath("/tl");
    return { toast: "Column saved successfully.", close: true };
  }

  async function deleteColumn() {
    "use server";
    if (!(await adminCheck())) redirect("/login");

    await db.delete(tierlistColumns).where(eq(tierlistColumns.id, id));
    await actionLog(`Deleted tierlist column ${id}`, column);

    revalidatePath("/admin/tl/layout");
    revalidatePath("/tl");
    return { toast: "Column deleted.", close: true };
  }

  return (
    <ModalBase title="Edit Column">
      <FormProvider
        id={`tl-layout-column-${id}`}
        onSubmit={submit}
        values={column}
      >
        <FormRow>
          <FormInput name="name" label="Name">
            <Input placeholder="Support" autoFocus />
          </FormInput>
          <FormInput name="id" label="ID">
            <Input placeholder="sup" disabled />
          </FormInput>
        </FormRow>
        <FormInput name="order" label="Order">
          <Input placeholder="10" />
        </FormInput>
        <FormInput name="image" label="Image" subLabel="optional">
          <CdnChooser />
        </FormInput>
        <DialogFooter>
          <Button asChild variant="destructive">
            <FormAction type="action" action={deleteColumn}>
              <Trash2 />
              Delete
            </FormAction>
          </Button>
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
              <SaveIcon />
              Save
            </FormAction>
          </Button>
        </DialogFooter>
      </FormProvider>
    </ModalBase>
  );
}

export const dynamic = "force-dynamic";
