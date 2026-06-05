import { sql } from "drizzle-orm";
import { PlusIcon } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CdnChooser } from "@/components/chooser";
import { FormAction, FormInput, FormProvider } from "@/components/form";
import { ModalBase } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { actionLog } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { tierlistTypes } from "@/lib/db/schema";
import { genId } from "./overrides";

export default async function TlTypeCreatePage() {
  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number>`MAX(${tierlistTypes.order})` })
    .from(tierlistTypes);

  async function submit(
    form: FormData,
  ) {
    "use server";
    if (!(await adminCheck())) redirect("/login");

    for (const field of ["name", "id", "order", "mode"] as const) {
      if (!form.get(field)) {
        return { error: `Field "${field}" is required.` };
      }
    }

    let data: typeof tierlistTypes.$inferInsert;

    try {
      data = {
        id: form.get("id") as string,
        name: form.get("name") as string,
        image: form.get("image") as string,
        mode: form.get("mode") as string,
        order: parseInt(form.get("order") as string, 10),
      };
      await db.insert(tierlistTypes).values(data);
    } catch (e) {
      console.error(e);
      const err = e as Error & { cause: { detail: string; message: string } };
      return {
        error:
          err?.cause?.detail || err?.cause?.message || "Failed to create type.",
      };
    }

    await actionLog(`Created tierlist type ${data.id}`, data);

    revalidatePath("/admin/tl/ver");
    return { toast: "Type created successfully.", close: true };
  }

  return (
    <ModalBase title="Create Tierlist Type">
      <FormProvider id="tl-type-create" onSubmit={submit}>
        <div className="flex gap-2">
          <div className="flex flex-col gap-2 grow">
            <FormInput name="name" override={genId} label="Name">
              <Input placeholder="Abyss" autoFocus />
            </FormInput>
          </div>
          <div className="flex flex-col gap-2 grow">
            <FormInput name="id" label="ID">
              <Input placeholder="aby" />
            </FormInput>
          </div>
        </div>
        <FormInput name="order" label="Order">
          <Input placeholder="1" defaultValue={maxOrder + 10} />
        </FormInput>
        <FormInput name="mode" label="Mode">
          <Input placeholder="ชั้น 12" />
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
