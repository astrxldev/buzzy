"use client";

import { Compass, Search } from "lucide-react";
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
    <div className="flex justify-center h-svh">
      <div className="w-full xl:max-w-2/3 border flex flex-col">
        <div className="border-b p-3 text-lg font-semibold leading-none flex items-center gap-2">
          <Compass className="opacity-50" />
          ไกด์ตัวละคร
        </div>
        <div className="p-4 pb-2">
          <InputGroup className="w-full h-12">
            <InputGroupInput
              placeholder="Search..."
              className="text-xl!"
              onChange={(ev) => setSearch(ev.target.value)}
            />
            <InputGroupAddon>
              {loading === 1 ? <Spinner /> : <Search />}
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div
          className={cn(
            "grid gap-4 p-4 grid-cols-[repeat(auto-fill,minmax(min(300px,calc(100svw-2rem-2px)),1fr))] overflow-auto transition-opacity",
            loading === 1 && "opacity-50",
          )}
        >
          {list.map((card) => (
            <Link href={card.link} key={card.id} target="_blank">
              <Card className="bg-card/50 hover:bg-border backdrop-blur-sm transition-colors py-3 sm:py-6 rounded-sm sm:rounded-xl">
                <CardHeader className="px-3 sm:px-6">
                  <CardTitle>{card.name}</CardTitle>
                  <div className="relative w-full aspect-square mt-2 rounded-sm sm:rounded-lg border overflow-hidden">
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
          ))}
        </div>
      </div>
    </div>
  );
}
