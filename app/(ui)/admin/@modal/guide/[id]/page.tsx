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
import { guides } from "@/lib/db/schema";

export default async function GuideEditPage({
  params,
}: PageProps<"/admin/guide/[id]">) {
  if (!(await adminCheck())) redirect("/login");
  const { id } = await params;
  const [guide] = await db.select().from(guides).where(eq(guides.id, id));
  if (!guide) notFound();

  async function submit(
    form: FormData,
  ) {
    "use server";
    if (!(await adminCheck())) redirect("/login");

    for (const field of ["name", "link"] as const) {
      if (!form.get(field)) {
        return { error: `Field "${field}" is required.` };
      }
    }

    let data: Partial<typeof guides.$inferSelect>;

    try {
      data = {
        name: form.get("name") as string,
        image: form.get("image") as string,
        link: form.get("link") as string,
        order: parseInt(form.get("order") as string, 10),
      };
      try {
        new URL(data.link!);
      } catch {
        return { error: "Invalid link." };
      }
      await db.update(guides).set(data).where(eq(guides.id, guide.id));
    } catch (e) {
      console.error(e);
      const err = e as Error & { cause: { detail: string; message: string } };
      return {
        error:
          err?.cause?.detail ||
          err?.cause?.message ||
          "Failed to update guide.",
      };
    }

    await actionLog(`Updated guide ${data.name}`, data);

    revalidatePath("/admin/guide");
    return { toast: "Guide updated successfully.", close: true };
  }

  async function deleteGuide() {
    "use server";
    if (!(await adminCheck())) redirect("/login");

    await db.delete(guides).where(eq(guides.id, id));

    await actionLog(`Deleted guide ${id}`);

    revalidatePath("/admin/guide");
    return { toast: "Guide deleted.", close: true };
  }

  return (
    <ModalBase title="Add Guide">
      <FormProvider id="guide-create" onSubmit={submit} values={guide}>
        <FormRow>
          <FormInput name="name" label="Name">
            <Input placeholder="[6.3] Flins Guide" autoFocus />
          </FormInput>
          <FormInput name="order" label="Order">
            <Input placeholder={`${guide.order}`} />
          </FormInput>
        </FormRow>
        <FormInput name="link" label="Link">
          <Input placeholder="https://docs.google.com/spreadsheets/..." />
        </FormInput>
        <FormInput name="image" label="Image" subLabel="optional">
          <CdnChooser />
        </FormInput>
        <DialogFooter>
          <Button asChild variant="destructive">
            <FormAction type="action" action={deleteGuide}>
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
