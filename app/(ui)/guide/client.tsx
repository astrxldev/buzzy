"use client";

import { Compass, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useDebounce } from "react-use";
import Image from "@/components/image";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import type { guides } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { searchGuide } from "./api";

export function GuideList({
  initialList,
}: {
  initialList: (typeof guides.$inferSelect)[];
}) {
  const [list, setList] = useState(initialList);
  const [loading, setLoading] = useState(2);
  const [search, setSearch] = useState("");

  useDebounce(
    () => {
      if (loading === 2) return setLoading(0);
      setLoading(1);
      searchGuide(search)
        .then(setList)
        .finally(() => setLoading(0));
    },
    200,
    [search],
  );

  return (
    <div className="flex h-svh justify-center">
      <div className="flex w-full flex-col border xl:max-w-2/3">
        <div>
          <Link
            href="/"
            className="flex items-center gap-2 border-b p-3 leading-none font-semibold"
          >
            <Compass className="opacity-50" />
            ไกด์ตัวละคร
          </Link>
        </div>
        <div className="p-4 pb-2">
          <InputGroup className="h-10 w-full">
            <InputGroupInput
              placeholder="ค้นหา..."
              onChange={(ev) => setSearch(ev.target.value)}
            />
            <InputGroupAddon>
              {loading === 1 ? <Spinner /> : <Search />}
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div
          className={cn(
            "grid grid-cols-[repeat(auto-fill,minmax(min(300px,calc(100svw-2rem-2px)),1fr))] gap-4 overflow-auto p-4 transition-opacity",
            loading === 1 && "opacity-50",
          )}
        >
          {list.length === 0 && loading === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
              <SearchX className="mb-4 h-16 w-16 opacity-50" />
              <p className="text-2xl font-semibold">ไม่พบตัวละครที่ค้นหา</p>
              <p className="text-lg ">ลองคำอื่นที่ความหมายใกล้เคียงกันดูนะ</p>
            </div>
          ) : (
            list.map((card) => (
              <Link href={card.link} key={card.id} target="_blank">
                <Card className="rounded-sm bg-card/50 py-3 backdrop-blur-sm transition-colors hover:bg-border sm:rounded-xl sm:py-6">
                  <CardHeader className="px-3 sm:px-6">
                    <CardTitle>{card.name}</CardTitle>
                    <div className="relative mt-2 aspect-square w-full overflow-hidden rounded-sm border sm:rounded-lg">
                      {card.image && (
                        <Image
                          src={`/cdn/${card.image}`}
                          alt={card.name}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
