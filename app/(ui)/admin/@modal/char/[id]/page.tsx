import { desc, eq } from "drizzle-orm";
import { ArrowRight, Save, Trash2 } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TypedFormData } from "@/app/(ui)/rubgram/type";
import { CdnChooser } from "@/components/chooser";
import { FormAction, FormInput, FormProvider } from "@/components/form";
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
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { characters, element as elementEnum, versions } from "@/lib/db/schema";

export default async function CharacterEditPage({
  params,
}: PageProps<"/admin/char/[id]">) {
  const { id: charId } = await params;
  const [versionList, [char]] = await Promise.all([
    db.select().from(versions).orderBy(desc(versions.id)),
    db.select().from(characters).where(eq(characters.id, charId)),
  ]);
  if (!char) redirect("/admin/char");

  async function submit(
    form: TypedFormData<{
      name: string;
      id: string;
      element: (typeof elementEnum.enumValues)[number];
      stars: "4" | "5";
      image: string;
      order: string;
      version: string;
      weapon: string;
      amber: string;
    }>,
  ) {
    "use server";
    if (!(await adminCheck())) redirect("/login");

    for (const field of [
      "name",
      "id",
      "element",
      "stars",
      "image",
      "order",
      "version",
      "weapon",
      "amber",
    ] as const) {
      if (!form.get(field)) {
        return { error: `Field "${field}" is required.` };
      }
    }

    try {
      await db
        .update(characters)
        .set({
          name: form.get("name")!,
          vision: form.get("element")!,
          stars: parseInt(form.get("stars") || "0", 10) as 4 | 5,
          image: form.get("image")!,
          order: parseInt(form.get("order")!, 10),
          version: form.get("version")!,
          weapon: form.get("weapon")!,
          amber: form.get("amber")!,
        })
        .where(eq(characters.id, charId));
    } catch (e) {
      console.error(e);
      return { error: "Failed to update character in database." };
    }

    revalidatePath("/admin/char");
    return { toast: "Character saved." };
  }

  async function deleteChar() {
    "use server";
    if (!(await adminCheck())) redirect("/login");

    await db.delete(characters).where(eq(characters.id, charId));

    revalidatePath("/admin/char");
    return { toast: "Character deleted.", close: true };
  }

  return (
    <ModalBase title="Edit Character">
      <FormProvider
        id="char-create"
        onSubmit={submit}
        values={{ ...char, stars: char.stars.toString(), element: char.vision }}
      >
        <div className="flex gap-2">
          <div className="flex flex-col gap-2 grow">
            <FormInput name="name" label="Name">
              <Input placeholder="Traveler (Electro)" autoFocus />
            </FormInput>
          </div>
          <div className="flex flex-col gap-2 grow">
            <FormInput name="id" label="ID (change = break)">
              <Input placeholder="traveler_electro" disabled />
            </FormInput>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col gap-2 grow">
            <FormInput name="element" label="Element">
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an Element" />
                </SelectTrigger>
                <SelectContent>
                  {elementEnum.enumValues.map((el) => (
                    <SelectItem key={el} value={el}>
                      {el.charAt(0).toUpperCase() + el.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormInput>
          </div>
          <div className="flex flex-col gap-2">
            <FormInput name="stars" label="Stars">
              <Select>
                <SelectTrigger className="w-min">
                  <SelectValue placeholder=" " />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
            </FormInput>
          </div>
        </div>
        <FormInput name="order" label="Order">
          <Input placeholder="1" />
        </FormInput>
        <FormInput name="version" label="Version">
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
        <FormInput name="image" label="Image">
          <CdnChooser />
        </FormInput>
        <Separator />
        <div className="flex gap-2">
          <div className="flex flex-col gap-2 grow">
            <FormInput name="weapon" label="Weapon" subLabel="(for Amber)">
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a weapon" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries({
                    WEAPON_SWORD_ONE_HAND: "Sword",
                    WEAPON_CATALYST: "Catalyst",
                    WEAPON_CLAYMORE: "Claymore",
                    WEAPON_BOW: "Bow",
                    WEAPON_POLE: "Polearm",
                  }).map(([id, weapon]) => (
                    <SelectItem key={id} value={id}>
                      {weapon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormInput>
          </div>
          <div className="flex flex-col gap-2 grow">
            <FormInput name="amber" label="Amber ID">
              <Input placeholder="10000005-electro" />
            </FormInput>
          </div>
        </div>
        <DialogFooter>
          <Button asChild variant="destructive">
            <FormAction type="action" action={deleteChar}>
              <Trash2 />
              Delete
            </FormAction>
          </Button>
          <DialogClose>
            <Button variant="outline" type="button">
              Cancel
            </Button>
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
              <Save />
              Save
            </FormAction>
          </Button>
        </DialogFooter>
      </FormProvider>
    </ModalBase>
  );
}
