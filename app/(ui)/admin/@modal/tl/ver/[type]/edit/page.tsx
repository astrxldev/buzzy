import { DialogClose } from "@radix-ui/react-dialog";
import { eq } from "drizzle-orm";
import { SaveIcon, Trash2 } from "lucide-react";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
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
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { actionLog } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { tierlistTypes } from "@/lib/db/schema";

export default async function TlTypeEditPage({
  params,
}: PageProps<"/admin/tl/ver/[type]/edit">) {
  if (!(await adminCheck())) redirect("/login");

  const { type: typeId } = await params;
  const [type] = await db
    .select()
    .from(tierlistTypes)
    .where(eq(tierlistTypes.id, typeId));
  if (!type) notFound();

  async function submit(
    form: TypedFormData<{
      name: string;
      id: string;
      order: string;
      image: string;
    }>,
  ) {
    "use server";
    if (!(await adminCheck())) redirect("/login");

    for (const field of ["name", "id", "order"] as const) {
      if (!form.get(field)) {
        return { error: `Field "${field}" is required.` };
      }
    }

    let data: typeof tierlistTypes.$inferInsert;

    try {
      data = {
        id: form.get("id")!,
        name: form.get("name")!,
        image: form.get("image")!,
        order: parseInt(form.get("order")!, 10),
      };
      await db
        .update(tierlistTypes)
        .set(data)
        .where(eq(tierlistTypes.id, typeId));
    } catch (e) {
      console.error(e);
      const err = e as Error & { cause: { detail: string; message: string } };
      return {
        error:
          err?.cause?.detail || err?.cause?.message || "Failed to update type.",
      };
    }

    await actionLog(`Updated tierlist type ${data.id}`, data);

    revalidatePath("/admin/tl/ver");
    return { toast: "Type saved successfully." };
  }

  async function deleteType() {
    "use server";
    if (!(await adminCheck())) redirect("/login");

    await db.delete(tierlistTypes).where(eq(tierlistTypes.id, typeId));

    await actionLog(`Deleted tierlist type ${typeId}`, type);

    revalidatePath("/admin/char");
    return { toast: "Type deleted.", close: true };
  }

  return (
    <ModalBase title="Create Tierlist Type">
      <FormProvider id="tl-type-create" onSubmit={submit} values={type}>
        <FormRow>
          <FormInput name="name" label="Name">
            <Input placeholder="Abyss" autoFocus />
          </FormInput>
          <FormInput name="id" label="ID" subLabel="(change = break)">
            <Input placeholder="aby" disabled />
          </FormInput>
        </FormRow>
        <FormInput name="order" label="Order">
          <Input placeholder="1" />
        </FormInput>

        <FormInput name="image" label="Image" subLabel="optional">
          <CdnChooser />
        </FormInput>
        <DialogFooter>
          <Button asChild variant="destructive">
            <FormAction type="action" action={deleteType}>
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
