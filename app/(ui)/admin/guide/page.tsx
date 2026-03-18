import { Pencil, PlusIcon } from "lucide-react";
import Link from "next/link";
import Image from "@/components/image";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { searchGuide } from "../../guide/api";

export default async function AdminGuidePage() {
  const list = await searchGuide();

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
            className="bg-card/50 hover:bg-border backdrop-blur-sm transition-colors py-3 sm:py-6 rounded-sm sm:rounded-xl group relative"
          >
            <Button
              size="icon"
              variant="outline"
              className="absolute opacity-0 group-hover:opacity-100 transition-opacity top-0 right-0 m-2"
              asChild
            >
              <Link href={`/admin/guide/${card.id}`}>
                <Pencil />
              </Link>
            </Button>
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
