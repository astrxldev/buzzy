import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import Banner from "#/banner.webp";
import ArtifactLogo from "#/logos/artifact.webp";
import RubgramLogo from "#/logos/rubgram.webp";
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

export default function Home() {
  return (
    <div className="relative h-svh w-full overflow-hidden flex items-center justify-center">
      <div className="max-w-340 w-full mx-auto px-4 sm:px-6 py-6">
        <Card className="max-w-lg w-full mx-auto pt-0">
          <Link href="https://www.youtube.com/@Genshinmaichaigamemurtur">
            <Image
              src={Banner}
              alt="Banner"
              className="w-full rounded-t-xl"
              width={500}
              height={100}
            />
          </Link>

          <CardContent className="space-y-6">
            <div className="flex flex-col gap-2">
              <Item variant="outline" asChild>
                <Link href="/artifact">
                  <ItemMedia className="justify-center">
                    <Image
                      src={ArtifactLogo}
                      alt="เสือกไอดีชาวบ้าน"
                      className="w-22"
                      width={100}
                      height={100}
                    />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>
                      <span>เสือกไอดีชาวบ้าน</span>
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

              <Item variant="outline" asChild>
                <Link href="/rubgram">
                  <ItemMedia className="justify-center">
                    <Image
                      src={RubgramLogo}
                      alt="รับกรรมแทนคนดู"
                      className="w-22"
                      width={100}
                      height={100}
                    />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>รับกรรมแทนทางบ้าน</ItemTitle>
                    <ItemDescription className="line-clamp-none hidden md:block">
                      รับเล่นคอนเท้น Endgame แทนคนดู{" "}
                      <span className="text-red-500">ไม่ฟรีนะคับ</span>
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <ChevronRightIcon className="size-4" />
                  </ItemActions>
                </Link>
              </Item>

              <Item variant="outline" asChild>
                <Link href="/tl">
                  <ItemMedia>
                    <Image
                      src={TierlistLogo}
                      alt="จัดเทียร์ลิสต์อบิส"
                      className="w-22"
                      width={100}
                      height={100}
                    />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>
                      <span>จัดเทียร์ลิสต์</span>
                    </ItemTitle>
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
              buzz.sudloh.com is not affiliated with HoYoverse. Game content and
              materials are trademarks and copyrights of HoYoverse.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
