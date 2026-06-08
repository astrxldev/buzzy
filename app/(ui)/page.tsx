import type { StaticImport } from "next/dist/shared/lib/get-img-props";
import Link from "next/link";
import type { ReactNode } from "react";
import Banner from "#/banner_t.webp";
import ArtifactLogo from "#/logos/artifact.webp";
import GuideLogo from "#/logos/guide.webp";
import RubgramLogo from "#/logos/rubgram.webp";
import TierlistLogo from "#/logos/tierlist.webp";
import DonateLogo from "#/logos/donate.svg";
import Image from "@/components/image";
import { SimpleTooltip } from "@/components/tooltip";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="flex w-full justify-center">
      <div className="max-w-6xl w-full mx-auto flex flex-col min-h-dvh">
        <section>
          <center>
            <Link href="https://www.youtube.com/@Genshinmaichaigamemurtur">
              <Image
                src={Banner}
                alt="Banner"
                className="rounded-t-xl mt-24 w-3/4 sm:w-125"
                width={500}
                height={100}
                fetchPriority="high"
              />
            </Link>
          </center>
        </section>

        <div className="flex flex-wrap justify-evenly my-10 gap-5">
          <HomeLink
            name="เสือกไอดีชาวบ้าน"
            desc="ระบบลงคิวดูอาร์ติแฟกต์เกนชินในไลฟ์สตรีม"
            href="/artifact"
            logo={ArtifactLogo}
          />
          <HomeLink
            name="รับกรรมแทนคนดู"
            desc={
              <>
                รับเล่นคอนเทนต์เอนเกมแทนคนดู{" "}
                <span className="text-red-500">ไม่ฟรีนะคับ</span>
              </>
            }
            href="/rubgram"
            logo={RubgramLogo}
          />
          <HomeLink
            name="จัดเทียร์ลิสต์อบิส"
            desc="ระบบจัดเทียร์ลิสต์ตัวละครของคอนเทนต์ Abyss และ Stygian"
            href="/tl"
            logo={TierlistLogo}
          />
          <HomeLink
            name="Guide"
            desc="ไกด์ตัวละครใน Google Sheets"
            href="/guide"
            logo={GuideLogo}
          />
          <HomeLink
            name="Donate"
            desc="โดเนทขึ้นไลฟ์สตรีม"
            href="/donate"
            logo={DonateLogo}
          />
        </div>
        <footer className="text-muted-foreground h-full flex flex-col justify-end pb-3 md:justify-center">
          <div className="flex justify-between flex-col text-center gap-2 sm:flex-row sm:text-left">
            <span className="text-sm my-auto">
              buzz.sudloh.com is not affiliated with HoYoverse. Game content
              <br />
              and materials are trademarks and copyrights of HoYoverse.
            </span>
            <div className="flex gap-2 justify-center sm:justify-start">
              <Link
                href="https://git.dgnr.us/astral/buzz"
                className="my-auto"
                target="_blank"
              >
                <svg
                  version="1.1"
                  id="main_outline"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  x="0px"
                  y="0px"
                  xmlSpace="preserve"
                  viewBox="5.67 143.05 628.65 387.55"
                  width={24}
                  height={24}
                  className="fill-current hover:fill-white w-6 h-5 mx-auto"
                >
                  <title>Gitea</title>
                  <g>
                    <path
                      id="teabag"
                      style={{ fill: "transparent" }}
                      d="M395.9,484.2l-126.9-61c-12.5-6-17.9-21.2-11.8-33.8l61-126.9c6-12.5,21.2-17.9,33.8-11.8   c17.2,8.3,27.1,13,27.1,13l-0.1-109.2l16.7-0.1l0.1,117.1c0,0,57.4,24.2,83.1,40.1c3.7,2.3,10.2,6.8,12.9,14.4   c2.1,6.1,2,13.1-1,19.3l-61,126.9C423.6,484.9,408.4,490.3,395.9,484.2z"
                    ></path>
                    <g>
                      <g>
                        <path d="M622.7,149.8c-4.1-4.1-9.6-4-9.6-4s-117.2,6.6-177.9,8c-13.3,0.3-26.5,0.6-39.6,0.7c0,39.1,0,78.2,0,117.2     c-5.5-2.6-11.1-5.3-16.6-7.9c0-36.4-0.1-109.2-0.1-109.2c-29,0.4-89.2-2.2-89.2-2.2s-141.4-7.1-156.8-8.5     c-9.8-0.6-22.5-2.1-39,1.5c-8.7,1.8-33.5,7.4-53.8,26.9C-4.9,212.4,6.6,276.2,8,285.8c1.7,11.7,6.9,44.2,31.7,72.5     c45.8,56.1,144.4,54.8,144.4,54.8s12.1,28.9,30.6,55.5c25,33.1,50.7,58.9,75.7,62c63,0,188.9-0.1,188.9-0.1s12,0.1,28.3-10.3     c14-8.5,26.5-23.4,26.5-23.4s12.9-13.8,30.9-45.3c5.5-9.7,10.1-19.1,14.1-28c0,0,55.2-117.1,55.2-231.1     C633.2,157.9,624.7,151.8,622.7,149.8z M125.6,353.9c-25.9-8.5-36.9-18.7-36.9-18.7S69.6,321.8,60,295.4     c-16.5-44.2-1.4-71.2-1.4-71.2s8.4-22.5,38.5-30c13.8-3.7,31-3.1,31-3.1s7.1,59.4,15.7,94.2c7.2,29.2,24.8,77.7,24.8,77.7     S142.5,359.9,125.6,353.9z M425.9,461.5c0,0-6.1,14.5-19.6,15.4c-5.8,0.4-10.3-1.2-10.3-1.2s-0.3-0.1-5.3-2.1l-112.9-55     c0,0-10.9-5.7-12.8-15.6c-2.2-8.1,2.7-18.1,2.7-18.1L322,273c0,0,4.8-9.7,12.2-13c0.6-0.3,2.3-1,4.5-1.5c8.1-2.1,18,2.8,18,2.8     l110.7,53.7c0,0,12.6,5.7,15.3,16.2c1.9,7.4-0.5,14-1.8,17.2C474.6,363.8,425.9,461.5,425.9,461.5z"></path>
                        <path d="M326.8,380.1c-8.2,0.1-15.4,5.8-17.3,13.8c-1.9,8,2,16.3,9.1,20c7.7,4,17.5,1.8,22.7-5.4     c5.1-7.1,4.3-16.9-1.8-23.1l24-49.1c1.5,0.1,3.7,0.2,6.2-0.5c4.1-0.9,7.1-3.6,7.1-3.6c4.2,1.8,8.6,3.8,13.2,6.1     c4.8,2.4,9.3,4.9,13.4,7.3c0.9,0.5,1.8,1.1,2.8,1.9c1.6,1.3,3.4,3.1,4.7,5.5c1.9,5.5-1.9,14.9-1.9,14.9     c-2.3,7.6-18.4,40.6-18.4,40.6c-8.1-0.2-15.3,5-17.7,12.5c-2.6,8.1,1.1,17.3,8.9,21.3c7.8,4,17.4,1.7,22.5-5.3     c5-6.8,4.6-16.3-1.1-22.6c1.9-3.7,3.7-7.4,5.6-11.3c5-10.4,13.5-30.4,13.5-30.4c0.9-1.7,5.7-10.3,2.7-21.3     c-2.5-11.4-12.6-16.7-12.6-16.7c-12.2-7.9-29.2-15.2-29.2-15.2s0-4.1-1.1-7.1c-1.1-3.1-2.8-5.1-3.9-6.3c4.7-9.7,9.4-19.3,14.1-29     c-4.1-2-8.1-4-12.2-6.1c-4.8,9.8-9.7,19.7-14.5,29.5c-6.7-0.1-12.9,3.5-16.1,9.4c-3.4,6.3-2.7,14.1,1.9,19.8     C343.2,346.5,335,363.3,326.8,380.1z"></path>
                      </g>
                    </g>
                  </g>
                </svg>
                Source
              </Link>
              <Link
                href="https://discord.gg/MWBk4JkefF"
                className="my-auto"
                target="_blank"
              >
                <svg
                  role="img"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  className="fill-current hover:fill-white w-5 mx-auto"
                >
                  <title>Discord</title>
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                </svg>
                Discord
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function HomeLink({
  name,
  href,
  logo,
  desc,
  className,
  disabled,
}: {
  href: string;
  name: string;
  desc: ReactNode;
  logo: string | StaticImport;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <SimpleTooltip text={desc}>
      <Link
        href={href}
        className={cn(
          "flex flex-col p-8 md:p-10 text-center",
          disabled && "pointer-events-none brightness-50",
          className,
        )}
      >
        <Image
          src={logo}
          alt={name}
          className="w-48 h-24 sm:w-50 sm:h-40 object-contain hover:scale-110 transition-transform duration-100"
          width={200}
          height={200}
        />
        <span className="md:hidden block visible text-lg md:text-xs">
          {name}
        </span>
      </Link>
    </SimpleTooltip>
  );
}
