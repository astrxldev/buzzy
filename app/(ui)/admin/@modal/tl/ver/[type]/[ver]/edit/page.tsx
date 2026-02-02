import { desc, eq } from "drizzle-orm";
import { ArrowRight, PlusIcon, SaveIcon, Trash2 } from "lucide-react";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { TypedFormData } from "@/app/(ui)/rubgram/type";
import { CdnChooser } from "@/components/chooser";
import { DatePicker } from "@/components/date";
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
import { Kbd, KbdGroup } from "@/components/ui/kbd";
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
import { tierlistTypes, tierlistVersions, versions } from "@/lib/db/schema";

export default async function TlVersionEditPage({
  params,
}: PageProps<"/admin/tl/ver/[type]/[ver]/edit">) {
  if (!(await adminCheck())) redirect("/login");
  const { type: typeId, ver: verId } = await params;
  const [[type], [ver], versionList] = await Promise.all([
    db.select().from(tierlistTypes).where(eq(tierlistTypes.id, typeId)),
    db.select().from(tierlistVersions).where(eq(tierlistVersions.id, verId)),
    db.select().from(versions).orderBy(desc(versions.id)),
  ]);
  if (!type) notFound();
  if (!ver) notFound();

  async function submit(
    form: TypedFormData<{
      name: string;
      id: string;
      order: string;
      from: string;
      image: string;
      disclaimer: string;
      deprecates: string;
    }>,
  ) {
    "use server";
    if (!(await adminCheck())) redirect("/login");

    for (const field of [
      "id",
      "name",
      "from",
      "deprecates",
      "order",
    ] as const) {
      if (!form.get(field)) {
        return { error: `Field "${field}" is required.` };
      }
    }

    let data: typeof tierlistVersions.$inferInsert;

    try {
      data = {
        id: form.get("id")!,
        name: form.get("name")!,
        image: form.get("image")!,
        disclaimer: form.get("disclaimer")!,
        from: form.get("from")!,
        deprecates: form.get("deprecates")!,
        order: parseInt(form.get("order")!, 10),
        type: typeId,
      };
      await db
        .update(tierlistVersions)
        .set(data)
        .where(eq(tierlistVersions.id, verId));
    } catch (e) {
      console.error(e);
      const err = e as Error & { cause: { detail: string; message: string } };
      return {
        error:
          err?.cause?.detail ||
          err?.cause?.message ||
          "Failed to create version.",
      };
    }

    await actionLog(`Updated tierlist version ${typeId}/${data.id}`, data);

    revalidatePath("/admin/tl/ver");
    return { toast: "Version saved successfully.", close: true };
  }

  async function deleteVersion() {
    "use server";
    if (!(await adminCheck())) redirect("/login");

    await db.delete(tierlistVersions).where(eq(tierlistVersions.id, verId));

    await actionLog(`Deleted tierlist version ${verId}`, type);

    revalidatePath("/admin/char");
    return { toast: "Version deleted.", close: true };
  }

  return (
    <ModalBase title={`Create ${type.name} Tierlist`}>
      <FormProvider id={`tl-${typeId}-create`} onSubmit={submit} values={ver}>
        <FormInput name="prefix">
          <input defaultValue={typeId} className="hidden" />
        </FormInput>
        <FormRow>
          <FormInput name="name" label="Name">
            <Input placeholder="6.3a" autoFocus />
          </FormInput>
          <FormInput name="id" label="ID" subLabel="change = break">
            <Input placeholder="63a" disabled />
          </FormInput>
        </FormRow>
        <FormInput name="order" label="Order">
          <Input placeholder="1" />
        </FormInput>
        <FormInput name="deprecates" label="Deprecation Date">
          <DatePicker />
        </FormInput>
        <FormRow>
          <FormInput name="from" label="Version">
            <Select>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a version" />
              </SelectTrigger>
              <SelectContent>
                {versionList.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    {version.name}{" "}
                    <KbdGroup>
                      <Kbd>{version.id}</Kbd>
                      {version.from && (
                        <Kbd>
                          <ArrowRight />
                          {version.from}
                        </Kbd>
                      )}
                    </KbdGroup>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormInput>
          <Button asChild size="icon">
            <Link href="/admin/ver/create">
              <PlusIcon />
            </Link>
          </Button>
        </FormRow>
        <FormRow>
          <FormInput name="image" label="Image" subLabel="optional">
            <CdnChooser />
          </FormInput>
          <FormInput name="disclaimer" label="Disclaimer" subLabel="optional">
            <CdnChooser />
          </FormInput>
        </FormRow>
        <DialogFooter>
          <Button asChild variant="destructive">
            <FormAction type="action" action={deleteVersion}>
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
