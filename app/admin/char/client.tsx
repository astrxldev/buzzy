"use client";
import { UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import Avatar from "@/components/avatar";
import SearchBox, { type Filters, type ParsedQuery } from "@/components/search";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <Dialog>
          <form>
            <DialogTrigger asChild>
              <Button className="h-10 w-10">
                <UserPlus />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Character</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="name-1">Name</Label>
                  <Input id="name-1" name="name" />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="username-1">Username</Label>
                  <Input
                    id="username-1"
                    name="username"
                    defaultValue="@peduarte"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </form>
        </Dialog>
      </div>
      <div className="flex flex-wrap gap-4 justify-center">
        {filteredChars.map((char) => (
          <Avatar char={char} key={char.id} />
        ))}
      </div>
    </div>
  );
}
