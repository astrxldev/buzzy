import { eq, isNotNull, or, type SQL } from "drizzle-orm";
import { Dice3, Trash2 } from "lucide-react";
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
} from "@/components/ui/sidebar";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { endgameSubmissions } from "@/lib/db/schema";
import { getEndgameConfig, random, wipe } from "../api";
import { LimitManager, SubmissionList, Watcher } from "./client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await adminCheck())) redirect("/");
  const subs = await db
    .select({
      id: endgameSubmissions.id,
      name: endgameSubmissions.name,
      checked: endgameSubmissions.checked,
      queue: endgameSubmissions.queue,
      paid: or(
        eq(endgameSubmissions.price, 0),
        isNotNull(endgameSubmissions.slip),
      ) as SQL<boolean>,
    })
    .from(endgameSubmissions)
    .orderBy(endgameSubmissions.id);
  const config = await getEndgameConfig();
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex justify-between items-center">
            <b>Admin</b>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={random}
              >
                <Dice3 size={24} className="size-6" />
              </Button>
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
        {children}
        <Watcher />
      </SidebarInset>
    </SidebarProvider>
  );
}
