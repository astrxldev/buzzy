import { eq, isNull, or, sql } from "drizzle-orm";
import { PlusIcon } from "lucide-react";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { CdnChooser } from "@/components/chooser";
import { FormAction, FormInput, FormProvider } from "@/components/form";
import { ModalBase } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { actionLog } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { tierlistBadges, tierlistTypes } from "@/lib/db/schema";

export default async function TlBadgeCreatePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  if (!(await adminCheck())) redirect("/login");

  const { type: typeId } = await params;
  const [[type], [{ maxOrder }]] = await Promise.all([
    db.select().from(tierlistTypes).where(eq(tierlistTypes.id, typeId)),
    db
      .select({
        maxOrder: sql<number>`COALESCE(MAX(${tierlistBadges.order}), 0)`,
      })
      .from(tierlistBadges)
      .where(or(isNull(tierlistBadges.type), eq(tierlistBadges.type, typeId))),
  ]);
  if (!type) notFound();

  async function submit(form: FormData) {
    "use server";
    if (!(await adminCheck())) redirect("/login");

    for (const field of ["name", "order", "scope"] as const) {
      if (!form.get(field)) {
        return { error: `Field "${field}" is required.` };
      }
    }

    let data: typeof tierlistBadges.$inferInsert;

    try {
      data = {
        name: form.get("name") as string,
        image: (form.get("image") as string) || null,
        order: parseInt(form.get("order") as string, 10),
        type: form.get("scope") === "global" ? null : typeId,
      };
      await db.insert(tierlistBadges).values(data);
    } catch (error) {
      console.error(error);
      const err = error as Error & {
        cause?: { detail?: string; message?: string };
      };
      return {
        error:
          err?.cause?.detail ||
          err?.cause?.message ||
          "Failed to create badge.",
      };
    }

    await actionLog(`Created tierlist badge for ${typeId}`, data);

    revalidatePath(`/admin/tl/${typeId}`);
    revalidatePath(`/tl/${typeId}`);
    return { toast: "Badge created successfully.", close: true };
  }

  return (
    <ModalBase title={`Create ${type.name} Badge`}>
      <FormProvider id={`tl-badge-${typeId}-create`} onSubmit={submit}>
        <FormInput name="name" label="Name">
          <Input placeholder="SP" autoFocus />
        </FormInput>
        <FormInput name="order" label="Order">
          <Input placeholder="10" defaultValue={(maxOrder ?? 0) + 10} />
        </FormInput>
        <FormInput name="scope" label="Scope">
          <Select defaultValue="local">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select badge scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">{type.name} local</SelectItem>
              <SelectItem value="global">Global</SelectItem>
            </SelectContent>
          </Select>
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
