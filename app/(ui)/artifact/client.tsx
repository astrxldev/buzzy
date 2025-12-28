/** biome-ignore-all lint/a11y/noStaticElementInteractions: Span is needed for double triggering */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: Not needed */
"use client";

import { BookAlert, CircleX, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import Avatar from "@/components/avatar";
import { Blocker } from "@/components/blocker";
import { ComboBox } from "@/components/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getCharacters } from "@/lib/api";
import { shared } from "@/lib/comms";
import { uidRegex } from "@/lib/const";
import type { characters } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import type { EnkaNetworkUser } from "@/types/enka";
import { RulesDialog } from "./rules";

export function CharacterChooser({
  clist,
}: {
  clist: {
    value: string;
    label: string;
  }[];
}) {
  const [uid, setUid] = useState("");
  const [chars, setChars] = useState<(typeof characters.$inferSelect)[]>([]);
  const [selected, setSelected] = useState<string | undefined>();
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setIsError(false);
    async function fetchChars() {
      if (!uidRegex.test(uid)) return setChars([]);
      const res = await fetch(`/api/enka/${uid}`);
      if (!res.ok) return setIsError(true);
      const data: EnkaNetworkUser = await res.json();
      if (!data.playerInfo.showAvatarInfoList) return setIsError(true);
      const charIds = data.playerInfo.showAvatarInfoList.map((c) =>
        c.avatarId.toString(),
      );
      const chars = await getCharacters(charIds);
      setChars(
        charIds.map((e) => chars.find((c) => c.amber === e)!).filter(Boolean),
      );
    }
    fetchChars()
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false));
  }, [uid]);

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="uid">UID</Label>
        <Input
          id="uid"
          name="uid"
          type="number"
          required
          placeholder="814006303"
          onChange={(ev) => setUid(ev.target.value)}
        />
      </div>
      <Label htmlFor="character">
        เลือกตัวละครที่ต้องการ
        {manual ? (
          <u
            className="ml-auto cursor-pointer"
            onClick={() => setManual(false)}
          >
            เลือกจากลิสต์
          </u>
        ) : (
          <span className="ml-auto">
            หาไม่เจอ?{" "}
            <u className="cursor-pointer" onClick={() => setManual(true)}>
              เลือกเอง
            </u>
          </span>
        )}
      </Label>
      {manual ? (
        <ComboBox
          placeholder="ค้นหาตัวละคร"
          id="character"
          name="character"
          data={clist}
          className="w-full bg-transparent! hover:bg-accent!"
        />
      ) : (
        <ScrollArea>
          {isError ? (
            <Placeholder>
              <CircleX className="text-red-500" /> เกิดข้อผิดพลาดในการดึงข้อมูล
            </Placeholder>
          ) : isLoading ? (
            <Placeholder>
              <Loader2 className="animate-spin" /> กำลังโหลดตัวละคร...
            </Placeholder>
          ) : !chars.length ? (
            <div className="flex gap-2 mb-2">
              <Placeholder />
              <Placeholder />
              <Placeholder />
              <Placeholder />
              <Placeholder />
            </div>
          ) : (
            <div className="flex gap-2 mb-2">
              <Placeholder
                className="w-[76.8px] cursor-pointer rounded-sm"
                onClick={() => setManual(true)}
              >
                <Search />
              </Placeholder>
              {chars.map((c) => (
                <Button key={c.id} asChild onClick={() => setSelected(c.name)}>
                  <Avatar
                    scale={0.6}
                    char={c}
                    selected={selected ? selected === c.name : 0}
                  />
                </Button>
              ))}
            </div>
          )}
          <ScrollBar orientation="horizontal" />
          <input
            id="character"
            name="character"
            type="hidden"
            value={selected}
          />
        </ScrollArea>
      )}
    </>
  );
}

function Placeholder({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "w-full h-[100.8px] flex gap-2 justify-center items-center rounded-md bg-muted",
        className,
      )}
      {...props}
    ></div>
  );
}

export function Disclaimer() {
  const [agreed, setAgreed] = useState(false);
  const [updated] = shared.state("updated");

  if (agreed || updated) return;
  return (
    <Blocker>
      <RulesDialog onOpenChange={(set) => !set && setAgreed(true)}>
        <Button variant="destructive" type="button">
          <BookAlert /> อ่านกฎ
        </Button>
      </RulesDialog>
    </Blocker>
  );
}

export function ClearCookie() {
  // biome-ignore lint/suspicious/noTsIgnore: typescript issue
  // @ts-ignore
  cookieStore.delete("sid");
  return "";
}

export function WarningDialog() {
  const [_manual, _setManual] = shared.state("manual");

  shared.signal("beforeSubmit", () => {
    _manual;
  });
}
