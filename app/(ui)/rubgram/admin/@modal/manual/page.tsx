import { PlusIcon } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import z from "zod";
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
import {
  endgameDiscord,
  endgameSlips,
  endgameSubmissions,
  endgameTypes,
} from "@/lib/db/schema";
import { CurrencyInput, ServiceSelect, SlipUpload, UserSelect } from "./client";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SlipokResponse } from "../../../api";
import { getDiscordUsers } from "@/app/api/discord/users/api";
import { th } from "zod/v4/locales";

const Schema = z.object({
  name: z.string(),
  price: z.string().regex(/^\d+$/),
  services: z.string().max(100),
  server: z.enum(["as", "us", "eu", "tw"]),
  slip: z.file(),
  discord: z.string().regex(/\d{17,20}/),
});

export default async function RgManualCreateModal() {
  if (!(await adminCheck())) redirect("/login");
  const types = await db.select().from(endgameTypes);
  async function submit(form: FormData) {
    "use server";
    if (!(await adminCheck())) redirect("/login");

    const raw = Object.fromEntries([...form.entries()]);
    z.config(th());
    const parsed = Schema.safeParse(raw);
    console.log(raw, parsed);
    if (!parsed.success) {
      return {
        error: parsed.error.issues.map((issue) => ({
          what: issue.message,
          where: issue.path.join("."),
        })),
      };
    }
    const { data } = parsed;

    const [{ id: slipId }] = await db
      .insert(endgameSlips)
      .values({
        slip: Buffer.from(await data.slip.arrayBuffer()),
        amount: data.price,
        ref: `MANUAL-${Bun.randomUUIDv7()}`,
        data: {} as SlipokResponse,
      })
      .returning({ id: endgameSlips.id });

    const users = await getDiscordUsers();
    const user = users.find((u) => u.uid === data.discord)!;

    await db
      .insert(endgameDiscord)
      .values({
        ...user,
        uid: data.discord,
      })
      .onConflictDoNothing();

    await db.insert(endgameSubmissions).values({
      ...data,
      price: Number(data.price),
      slip: slipId,
      user: data.discord,
      service: data.services.split(","),
    });

    await actionLog(`Manually added rubgram submission "${data.name}"`, data);

    revalidatePath("/rubgram/admin");
    return { toast: "Submission added successfully.", close: true };
  }

  return (
    <ModalBase title="Create Submission">
      <FormProvider id="rg-create" onSubmit={submit}>
        <FormRow>
          <FormInput name="name" label="Name">
            <Input placeholder="Dreamgineer" autoFocus />
          </FormInput>
          <FormInput name="price" label="Price" className="flex-1">
            <CurrencyInput placeholder="ฟรี" />
          </FormInput>
        </FormRow>
        <FormInput name="services" label="Services">
          <ServiceSelect types={types} />
        </FormInput>
        <FormInput name="server">
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="เลือกเซิร์ฟเวอร์ที่คุณอยู่" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>เซิร์ฟเวอร์</SelectLabel>
                <SelectItem value="as">Asia</SelectItem>
                <SelectItem value="us">America</SelectItem>
                <SelectItem value="eu">Europe</SelectItem>
                <SelectItem value="tw">TW, HK, MO</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormInput>
        <FormInput name="slip" label="">
          <SlipUpload />
        </FormInput>
        <FormInput name="discord" label="User">
          <UserSelect />
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

export const dynamic = "force-dynamic";
