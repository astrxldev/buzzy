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
    <div className="grow-0 flex flex-col pt-5 gap-2 mx-4">
      <Button className="w-fit" asChild>
        <Link href={`/admin/guide/create`}>
          <PlusIcon />
          <span>Add guide</span>
        </Link>
      </Button>
      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(300px,calc(100svw-2rem-2px)),1fr))]">
        {list.map((card) => (
          <Card
            key={card.id}
            className={cn(
              "bg-card/50 hover:bg-border backdrop-blur-sm transition-colors py-3 sm:py-6 rounded-sm sm:rounded-xl group relative",
              card.hidden && "opacity-70",
            )}
          >
            <div className="flex gap-1 absolute opacity-0 group-hover:opacity-100 transition-opacity top-0 right-0 m-2">
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
        ))}
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
