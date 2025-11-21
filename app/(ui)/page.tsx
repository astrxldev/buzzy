import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import Banner from "#/banner.webp";
import ArtifactLogo from "#/logos/artifact.webp";
import TierlistLogo from "#/logos/tierlist.webp";
import Image from "@/components/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { PageTransition } from "../transition";

export default function Home() {
  return (
    <PageTransition>
      <div className="relative h-svh w-full overflow-hidden flex items-center justify-center">
        <div className="max-w-340 w-full mx-auto px-4 sm:px-6 py-6">
          <Card className="max-w-lg w-full mx-auto pt-0">
            <Image
              src={Banner}
              alt="Banner"
              className="w-full rounded-t-xl"
              width={500}
              height={100}
            />

            <CardContent className="space-y-6">
              <div className="flex flex-col gap-2">
                <Item variant="outline" asChild>
                  <Link href="/artifact">
                    <ItemMedia className="justify-center">
                      <Image
                        src={ArtifactLogo}
                        alt="เสือกไอดีชาวบ้าน"
                        className="w-[calc(100svw-112px)] md:w-22"
                        width={500}
                        height={500}
                      />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>
                        <span className="hidden md:block">เสือกไอดีชาวบ้าน</span>
                        <span className="block md:hidden">
                          ตรวจแฟกต์เกนชินในไลฟ์
                        </span>
                      </ItemTitle>
                      <ItemDescription className="line-clamp-none hidden md:block">
                        ระบบลงคิวดูอาร์ติแฟกต์เกนชินในไลฟ์สตรีม
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <ChevronRightIcon className="size-4" />
                    </ItemActions>
                  </Link>
                </Item>

                {/* <Item variant="outline" asChild>
                  <Link href="/endgame">
                    <ItemMedia className="justify-center">
                      <Image
                        src={ArtifactLogo}
                        alt="รับกรรมแทนคนดู"
                        className="w-[calc(100svw-112px)] md:w-22"
                        width={500}
                        height={500}
                      />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>รับกรรมแทนคนดู</ItemTitle>
                      <ItemDescription className="line-clamp-none hidden md:block">
                        ระบบลงคิวดูอาร์ติแฟกต์เกนชินในไลฟ์สตรีม
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <ChevronRightIcon className="size-4" />
                    </ItemActions>
                  </Link>
                </Item> */}

                <Item variant="outline" asChild>
                  <Link href="/tl">
                    <ItemMedia>
                      <Image
                        src={TierlistLogo}
                        alt="จัดเทียร์ลิสต์อบิส"
                        className="w-22"
                        width={500}
                        height={500}
                      />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>จัดเทียร์ลิสต์</ItemTitle>
                      <ItemDescription className="line-clamp-none hidden md:block">
                        ระบบจัดเทียร์ลิสต์ตัวละครของคอนเท้น Abyss และ Stygain
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <ChevronRightIcon className="size-4" />
                    </ItemActions>
                  </Link>
                </Item>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-center text-muted-foreground">
                buzz.sudloh.com is not affiliated with HoYoverse. Game content
                and materials are trademarks and copyrights of HoYoverse.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
