import { ChevronRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Banner from "#/banner.webp";
import ArtifactLogo from "#/logos/artifact.webp";
import TierlistLogo from "#/logos/tierlist.webp";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { PageTransition } from "./transition";

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
                          ตรวจแฟลกเกนชินรายแพทช์
                        </span>
                      </ItemTitle>
                      <ItemDescription className="line-clamp-none hidden md:block">
                        ใครอยากให้ดูอาร์ติแฟกต์ให้ในไลฟ์ ไปกรอกแบบฟอร์มได้เลย
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
                        width={500}
                        height={500}
                      />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>จัดเทียร์ลิสต์</ItemTitle>
                      <ItemDescription className="line-clamp-none hidden md:block">
                        เทียร์ลิสต์เมต้าตัวละครของอบิสแพทช์นั้นๆเท่านั้น
                        ซึ่งจะเปลี่ยนไปในแต่ละแพทช์ตามความสามารถของตัวละครในการรับมือกับอบิสแพทช์นั้นๆ
                        ไม่ใช่เทียร์ลิสต์ภาพรวมของตัวละคร
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
                buzz.gunshiz.top is not affiliated with HoYoverse. Game content
                and materials are trademarks and copyrights of HoYoverse.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
