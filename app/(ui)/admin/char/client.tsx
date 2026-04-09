"use client";
import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import Avatar from "@/components/avatar";
import SearchBox, { type Filters, type ParsedQuery } from "@/components/search";
import { SimpleTooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import { type characters, element } from "@/lib/db/schema";

/** Filters and their value providers */
const filters: Filters = {
  stars: () => ["4", "5"],
  type: () => ["sword", "catalyst", "claymore", "bow", "polearm"],
  element: () => element.enumValues,
};

export function CharManager({
  chars,
}: {
  chars: (typeof characters.$inferSelect)[];
}) {
  const [query, setQuery] = useState<ParsedQuery>();

  const filteredChars = useMemo(() => {
    return chars.filter((char) =>
      query
        ? (query.filters.stars
            ? char.stars.toString() === query.filters.stars
            : true) &&
          (query.filters.element
            ? char.vision === query.filters.element
            : true) &&
          (query.filters.weapon
            ? char.weapon.toLowerCase().includes(query.filters.type)
            : true) &&
          char.name.toLowerCase().includes(query.search.toLowerCase())
        : true,
    );
  }, [query, chars]);

  return (
    <div className="flex flex-col w-full">
      <div className="flex gap-2 justify-center p-2">
        <SearchBox
          filters={filters}
          className="bg-input sticky top-2"
          onQueryChange={setQuery}
        />
        <SimpleTooltip text="เพิ่มตัวละคร" side="right">
          <Button className="h-10 w-10" asChild>
            <Link href="/admin/char/create">
              <UserPlus />
            </Link>
          </Button>
        </SimpleTooltip>
      </div>
      <div className="flex flex-wrap gap-4 justify-center">
        {filteredChars.map((char) => (
          <Link href={`/admin/char/${char.id}`} key={char.id}>
            <Avatar char={char} />
          </Link>
        ))}
      </div>
    </div>
  );
}
