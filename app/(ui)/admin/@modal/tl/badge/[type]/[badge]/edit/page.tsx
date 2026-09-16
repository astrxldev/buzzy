import { and, eq, isNull, or } from "drizzle-orm";
import { SaveIcon, Trash2 } from "lucide-react";
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

export default async function TlBadgeEditPage({
  params,
}: {
  params: Promise<{ type: string; badge: string }>;
}) {
  if (!(await adminCheck())) redirect("/login");

  const { type: typeId, badge: badgeId } = await params;
  const [[type], [badge]] = await Promise.all([
    db.select().from(tierlistTypes).where(eq(tierlistTypes.id, typeId)),
    db
      .select()
      .from(tierlistBadges)
      .where(
        and(
          eq(tierlistBadges.id, badgeId),
          or(isNull(tierlistBadges.type), eq(tierlistBadges.type, typeId)),
        ),
      ),
  ]);
  if (!type) notFound();
  if (!badge) notFound();

  async function submit(form: FormData) {
    "use server";
    if (!(await adminCheck())) redirect("/login");

    for (const field of ["name", "order", "scope"] as const) {
      if (!form.get(field)) {
        return { error: `Field "${field}" is required.` };
      }
    }

    let data: Partial<typeof tierlistBadges.$inferInsert>;

    try {
      data = {
        name: form.get("name") as string,
        image: (form.get("image") as string) || null,
        order: parseInt(form.get("order") as string, 10),
        type: form.get("scope") === "global" ? null : typeId,
      };
      await db
        .update(tierlistBadges)
        .set(data)
        .where(eq(tierlistBadges.id, badgeId));
    } catch (error) {
      console.error(error);
      const err = error as Error & {
        cause?: { detail?: string; message?: string };
      };
      return {
        error:
          err?.cause?.detail ||
          err?.cause?.message ||
          "Failed to update badge.",
      };
    }

    await actionLog(`Updated tierlist badge ${badgeId}`, data);

    revalidatePath(`/admin/tl/${typeId}`);
    revalidatePath(`/tl/${typeId}`);
    return { toast: "Badge saved successfully.", close: true };
  }

  async function deleteBadge() {
    "use server";
    if (!(await adminCheck())) redirect("/login");

    await db.delete(tierlistBadges).where(eq(tierlistBadges.id, badgeId));

    await actionLog(`Deleted tierlist badge ${badgeId}`, badge);

    revalidatePath(`/admin/tl/${typeId}`);
    revalidatePath(`/tl/${typeId}`);
    return { toast: "Badge deleted.", close: true };
  }

  return (
    <ModalBase title={`Edit ${type.name} Badge`}>
      <FormProvider
        id={`tl-badge-${typeId}-${badgeId}`}
        onSubmit={submit}
        values={{ ...badge, scope: badge.type === null ? "global" : "local" }}
      >
        <FormInput name="name" label="Name">
          <Input placeholder="SP" autoFocus />
        </FormInput>
        <FormInput name="order" label="Order">
          <Input placeholder="10" />
        </FormInput>
        <FormInput name="scope" label="Scope">
          <Select>
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
          <Button asChild variant="destructive">
            <FormAction type="action" action={deleteBadge}>
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
