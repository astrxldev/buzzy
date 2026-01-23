import { desc, sql } from "drizzle-orm";
import { ArrowRight, PlusIcon } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TypedFormData } from "@/app/(ui)/rubgram/type";
import { CdnChooser } from "@/components/chooser";
import { FormAction, FormInput, FormProvider } from "@/components/form";
import { ModalBase } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
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
import { actionLog } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { characters, element as elementEnum, versions } from "@/lib/db/schema";
import { genId } from "./overrides";

export default async function CharacterCreatePage() {
  const [[{ maxOrder }], versionList] = await Promise.all([
    db
      .select({ maxOrder: sql<number>`MAX(${characters.order})` })
      .from(characters),
    db.select().from(versions).orderBy(desc(versions.id)),
  ]);

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

    let data: typeof characters.$inferInsert;

    try {
      data = {
        id: form.get("id")!,
        name: form.get("name")!,
        vision: form.get("element")!,
        stars: parseInt(form.get("stars") || "0", 10) as 4 | 5,
        image: form.get("image")!,
        order: parseInt(form.get("order")!, 10),
        version: form.get("version")!,
        weapon: form.get("weapon")!,
        amber: form.get("amber")!,
      };
      await db.insert(characters).values(data);
    } catch (e) {
      console.error(e);
      return { error: "Failed to update character in database." };
    }

    actionLog(`Created character ${data.id}`, data);

    revalidatePath("/admin/char");
    return { toast: "Character created successfully.", close: true };
  }

  return (
    <ModalBase title="Create Character">
      <FormProvider id="char-create" onSubmit={submit}>
        <div className="flex gap-2">
          <div className="flex flex-col gap-2 grow">
            <FormInput name="name" override={genId} label="Name">
              <Input placeholder="Traveler (Electro)" autoFocus />
            </FormInput>
          </div>
          <div className="flex flex-col gap-2 grow">
            <FormInput name="id" label="ID">
              <Input placeholder="traveler_electro (Automatic)" />
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
          <Input placeholder="1" defaultValue={maxOrder + 10} />
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
          <FormAction type="clear" asChild>
            <Button variant="outline">Clear</Button>
          </FormAction>
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
