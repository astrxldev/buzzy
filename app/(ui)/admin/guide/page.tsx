import { EyeIcon, EyeOffIcon, Pencil, PlusIcon } from "lucide-react";
import Link from "next/link";
import Image from "@/components/image";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { searchGuide } from "../../guide/api";
import { hideGuide } from "./api";

export default async function AdminGuidePage() {
  const list = await searchGuide("", true);

  return (
    <div className="mx-4 flex grow-0 flex-col gap-2 pt-5">
      <Button className="w-fit" asChild>
        <Link href={`/admin/guide/create`}>
          <PlusIcon />
          <span>Add guide</span>
        </Link>
      </Button>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,calc(100svw-2rem-2px)),1fr))] gap-4">
        {list.map((card) => (
          <Card
            key={card.id}
            className={cn(
              "group relative rounded-sm bg-card/50 py-3 backdrop-blur-sm transition-colors hover:bg-border sm:rounded-xl sm:py-6",
              card.hidden && "opacity-70",
            )}
          >
            <div className="absolute top-0 right-0 m-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                size="icon"
                variant="outline"
                onClick={hideGuide.bind(null, card.id)}
              >
                {card.hidden ? <EyeOffIcon /> : <EyeIcon />}
              </Button>
              <Button size="icon" variant="outline" asChild>
                <Link href={`/admin/guide/${card.id}`}>
                  <Pencil />
                </Link>
              </Button>
            </div>
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
        ))}
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
