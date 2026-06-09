import { Dice5, PlusIcon, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { endgameSubmissions } from "@/lib/db/schema";
import { getEndgameConfig, random, wipe } from "../api";
import { LimitManager, SlipButton, SubmissionList, Watcher } from "./client";
import { desc, sql } from "drizzle-orm";
import Link from "next/link";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorModal } from "@/components/error";

export default async function AdminLayout({
  modal,
  children,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  if (!(await adminCheck()))
    redirect(`/login?next=${encodeURIComponent("/rubgram/admin")}`);
  const subs = await db
    .select({
      id: endgameSubmissions.id,
      name: endgameSubmissions.name,
      checked: endgameSubmissions.checked,
      queue: endgameSubmissions.queue,
      publicQueue: sql<number>`
        ${endgameSubmissions.queue} - (
          select count(*)
          from ${endgameSubmissions} e2
          where e2.checked = true
            and e2.queue < ${endgameSubmissions.queue}
            or  e2.archived
        )
      `,
      paid: endgameSubmissions.paid,
      archived: endgameSubmissions.archived,
    })
    .from(endgameSubmissions)
    .orderBy(desc(endgameSubmissions.archived), endgameSubmissions.id);
  const config = await getEndgameConfig();
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between">
            <b>Admin</b>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="size-8" asChild>
                <Link href="/rubgram/admin/manual">
                  <PlusIcon size={24} className="size-6" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={random}
              >
                <Dice5 size={24} className="size-6" />
              </Button>
              <SlipButton />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <Trash2 size={24} className="size-6 text-red-500" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="z-101">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      คุณมั่นใจที่จะล้างข้อมูลทั้งหมดใช่ไหม?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      การกระทำนี้ไม่สามารถย้อนกลับได้ เราจะลบบัญชีของท่านออกจากระบบ
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                    <AlertDialogAction onClick={wipe}>
                      ดำเนินการต่อ
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>รับกรรมแทนทางบ้าน</SidebarGroupLabel>
            <SidebarMenu>
              <SubmissionList subs={subs} />
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarGroup>
            <SidebarGroupLabel>การตั้งค่า</SidebarGroupLabel>
            <LimitManager
              config={config}
              length={subs.reduce((c, s) => c + (s.paid ? 1 : 0), 0)}
            />
          </SidebarGroup>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-transparent">
        <ErrorBoundary errorComponent={ErrorModal}>{modal}</ErrorBoundary>
        {children}
        <div className="absolute bottom-1 left-1 block opacity-50 hover:opacity-100 md:hidden">
          <SidebarTrigger />
        </div>
        <Watcher />
      </SidebarInset>
    </SidebarProvider>
  );
}
