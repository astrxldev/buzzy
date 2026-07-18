<script lang="ts">
  import FadeImage from "$lib/components/FadeImage.svelte";
  import Tooltip from "$lib/components/Tooltip.svelte";
  import { cn } from "$lib/utils";

  const links = [
    {
      name: "เสือกไอดีชาวบ้าน",
      desc: "ระบบลงคิวดูอาร์ติแฟกต์เกนชินในไลฟ์สตรีม",
      href: "/artifact",
      logo: "/logos/artifact.webp",
    },
    {
      name: "รับกรรมแทนคนดู",
      desc: "รับเล่นคอนเทนต์เอนเกมแทนคนดู ไม่ฟรีนะคับ",
      href: "/rubgram",
      logo: "/logos/rubgram.webp",
    },
    {
      name: "จัดเทียร์ลิสต์อบิส",
      desc: "ระบบจัดเทียร์ลิสต์ตัวละครของคอนเทนต์ Abyss และ Stygian",
      href: "/tl",
      logo: "/logos/tierlist.webp",
    },
    {
      name: "ไกด์ตัวละคร",
      desc: "ไกด์ตัวละครใน Google Sheets",
      href: "/guide",
      logo: "/logos/guide.webp",
    },
    {
      name: "โดเนทขึ้นจอ",
      desc: "โดเนทขึ้นไลฟ์สตรีม",
      href: "/donate",
      logo: "/logos/donate.webp",
    },
  ];
</script>

<svelte:head>
  <title>เกนชินไม่ใช่เกมมือถือ</title>
</svelte:head>

<div class="flex w-full justify-center">
  <div class="mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
    <section>
      <div class="text-center">
        <a href="https://www.youtube.com/@Genshinmaichaigamemurtur">
          <FadeImage
            src="/banner_t.webp"
            alt="Banner"
            class="mt-24 inline-block w-3/4 rounded-t-xl sm:w-125"
            width="500"
            height="100"
            fetchpriority="high"
          />
        </a>
      </div>
    </section>

    <div class="my-10 flex flex-wrap justify-evenly gap-5">
      {#each links as link}
        <Tooltip text={link.desc}>
          <a
            href={link.href}
            class={cn("flex flex-col p-8 text-center md:p-10")}
          >
            <FadeImage
              src={link.logo}
              alt={link.name}
              class="h-24 w-48 object-contain transition-transform duration-100 hover:scale-110 sm:h-40 sm:w-50"
              width="200"
              height="200"
            />
            <span class="visible block text-lg md:hidden md:text-xs">
              {link.name}
            </span>
          </a>
        </Tooltip>
      {/each}
    </div>

    <footer
      class="flex h-full flex-col justify-end pb-3 text-muted-foreground md:justify-center"
    >
      <div
        class="flex flex-col justify-between gap-2 text-center sm:flex-row sm:text-left"
      >
        <span class="my-auto text-sm">
          buzz.sudloh.com is not affiliated with HoYoverse. Game content
          <br />
          and materials are trademarks and copyrights of HoYoverse.
        </span>
        <div class="flex justify-center gap-2 sm:justify-start">
          <a
            href="https://git.dgnr.us/astral/buzz"
            class="my-auto flex items-center gap-1 hover:text-white"
            target="_blank"
            rel="noreferrer"
          >
            <svg
              viewBox="5.67 143.05 628.65 387.55"
              width="24"
              height="24"
              class="h-5 w-6 fill-current"
              aria-hidden="true"
            >
              <path
                d="M622.7 149.8c-4.1-4.1-9.6-4-9.6-4s-117.2 6.6-177.9 8c-13.3.3-26.5.6-39.6.7v117.2l-16.6-7.9-.1-109.2c-29 .4-89.2-2.2-89.2-2.2S148.3 145.3 132.9 143.9c-9.8-.6-22.5-2.1-39 1.5-8.7 1.8-33.5 7.4-53.8 26.9C-4.9 212.4 6.6 276.2 8 285.8c1.7 11.7 6.9 44.2 31.7 72.5 45.8 56.1 144.4 54.8 144.4 54.8s12.1 28.9 30.6 55.5c25 33.1 50.7 58.9 75.7 62 63 0 188.9-.1 188.9-.1s12 .1 28.3-10.3c14-8.5 26.5-23.4 26.5-23.4s12.9-13.8 30.9-45.3c5.5-9.7 10.1-19.1 14.1-28 0 0 55.2-117.1 55.2-231.1-1.1-34.5-9.6-40.6-11.6-42.6z"
              />
            </svg>
            Source
          </a>
          <a
            href="https://discord.gg/MWBk4JkefF"
            class="my-auto flex items-center gap-1 hover:text-white"
            target="_blank"
            rel="noreferrer"
          >
            <svg
              role="img"
              viewBox="0 0 24 24"
              class="w-5 fill-current"
              aria-hidden="true"
            >
              <path
                d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"
              />
            </svg>
            Discord
          </a>
        </div>
      </div>
    </footer>
  </div>
</div>
