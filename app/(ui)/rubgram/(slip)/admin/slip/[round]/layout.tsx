import { eq, sql } from "drizzle-orm";
import { ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
import Link from "next/link";
import { cache, Suspense } from "react";
import { SidebarLink } from "@/app/(ui)/admin/client";
import { SimpleTooltip } from "@/components/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { db } from "@/lib/db";
import { endgameArchive } from "@/lib/db/schema";
import { parseSearchNumber } from "@/lib/utils";
import { Watcher } from "../../../../admin/client";

export default async function ({
  params,
  children,
}: {
  params: Promise<{ round: string }>;
  children: React.ReactNode;
}) {
  const { round: r } = await params;
  const round = parseSearchNumber(r);
  return (
    <SidebarProvider>
      <Suspense fallback={<Sidebar />}>
        <ThisSidebar round={round} />
      </Suspense>
      <SidebarInset className="bg-transparent">
        {children}
        <div className="absolute bottom-1 left-1 block opacity-50 hover:opacity-100 md:hidden">
          <SidebarTrigger />
        </div>
        <Watcher />
      </SidebarInset>
    </SidebarProvider>
  );
}

const getRange = cache(
  async () =>
    await db
      .select({
        min: sql<number>`min(${endgameArchive.round})`,
        max: sql<number>`max(${endgameArchive.round})`,
      })
      .from(endgameArchive),
);
const getEntries = cache(
  async (round: number) =>
    await db
      .select()
      .from(endgameArchive)
      .where(eq(endgameArchive.round, round))
      .orderBy(endgameArchive.queue),
);

async function ThisSidebar({ round }: { round: number }) {
  const [[{ min, max }], entries] = await Promise.all([
    getRange(),
    getEntries(round),
  ]);

  return (
    <Sidebar variant="floating">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              asChild
            >
              <span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-foreground">
                      <ReceiptText className="size-4" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-(--radix-dropdown-menu-trigger-width)"
                    align="start"
                  >
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>เลือกรอบ</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={`${round}`}>
                        {range(min, max + 1)
                          .toReversed()
                          .map((r) => (
                            <Link href={`/rubgram/admin/slip/${r}`} key={r}>
                              <DropdownMenuRadioItem value={`${r}`}>
                                รอบที่ {r}
                              </DropdownMenuRadioItem>
                            </Link>
                          ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">ประวัติสลิปรายได้</span>
                  <span>รอบที่ {round}</span>
                </div>
                <div className="ml-auto flex h-full items-center justify-evenly">
                  {round <= min ? (
                    <ChevronLeft className="size-4 text-muted-foreground" />
                  ) : (
                    <SimpleTooltip text="รอบก่อนหน้า" side="right">
                      <Link
                        href={`/rubgram/admin/slip/${round - 1}`}
                        className="flex h-full items-center"
                      >
                        <ChevronLeft className="size-4" />
                      </Link>
                    </SimpleTooltip>
                  )}
                  {round >= max ? (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  ) : (
                    <SimpleTooltip text="รอบถัดไป" side="right">
                      <Link
                        href={`/rubgram/admin/slip/${round + 1}`}
                        className="flex h-full items-center"
                      >
                        <ChevronRight className="size-4" />
                      </Link>
                    </SimpleTooltip>
                  )}
                </div>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {entries.map((e) => (
              <SidebarMenu key={e.id}>
                <SidebarMenuItem>
                  <SidebarLink
                    prefetch
                    href={`/rubgram/admin/slip/${round}/${e.queue}`}
                  >
                    {e.queue}. {e.name}
                  </SidebarLink>
                </SidebarMenuItem>
              </SidebarMenu>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="justify-center">
              รายได้รวม {entries.reduce((a, e) => a + e.price, 0)} บาท
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

const range = (start: number, stop?: number, step?: number) => {
  // Handle cases where stop/step are optional (e.g., range(5) -> [0, 1, 2, 3, 4])
  if (stop === undefined) {
    [stop, start] = [start, 0];
  }
  if (step === undefined) {
    step = start < stop ? 1 : -1;
  }

  // Calculate the length of the array
  const length = Math.ceil((stop - start) / step);

  // Create the array using Array.from() and a map function
  return Array.from({ length }, (_, index) => start + index * step);
};
