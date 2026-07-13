import { isNotNull, sql } from "drizzle-orm";
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
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getArtifactConfig, random, wipe } from "@/lib/api";
import { adminCheck } from "@/lib/auth";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { LimitManager, SubmissionList, Watcher } from "./client";

export const metadata = {
  title: "เสือกไอดีชาวบ้าน (แอดมิน)",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await adminCheck()))
    redirect(`/login?next=${encodeURIComponent("/artifact/admin")}`);
  const subs = (
    await db.execute(sql`
    WITH max_checked AS (
      SELECT MAX(queue) AS max_queue
      FROM artifact.submissions
      WHERE checked = TRUE
        AND queue IS NOT NULL
    )
    SELECT *
    FROM artifact.submissions s
    CROSS JOIN max_checked m
    ORDER BY
      CASE
        WHEN s.queue IS NULL AND s.checked = TRUE
          THEN -1
    
        WHEN s.queue IS NULL AND s.checked = FALSE
          THEN COALESCE(m.max_queue, 0)::numeric + 0.5
    
        ELSE s.queue
      END,
  s.id;`)
  ).rows as (typeof submissions.$inferSelect)[];
  const config = await getArtifactConfig();
  const count = await db
    .select({ a: sql`NULL` })
    .from(submissions)
    .where(isNotNull(submissions.queue))
    .then((e) => e.length);
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between">
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
            <SidebarGroupLabel>เสือกไอดีชาวบ้าน</SidebarGroupLabel>
            <SidebarMenu>
              <SubmissionList subs={subs} />
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarGroup>
            <SidebarGroupLabel>การตั้งค่า</SidebarGroupLabel>
            <LimitManager config={config} length={count} />
          </SidebarGroup>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-transparent">
        {children}
        <div className="absolute bottom-15 left-4 block opacity-50 hover:opacity-100 md:hidden">
          <SidebarTrigger />
        </div>
        <Watcher />
      </SidebarInset>
    </SidebarProvider>
  );
}
