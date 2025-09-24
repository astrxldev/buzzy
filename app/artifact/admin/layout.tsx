import { Dice3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu, SidebarProvider
} from "@/components/ui/sidebar";
import { getArtifactConfig, random, wipe } from "@/lib/api";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { LimitManager, SubmissionList } from "./client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const subs = await db
    .select({
      id: submissions.id,
      name: submissions.name,
      checked: submissions.checked,
      queue: submissions.queue,
    })
    .from(submissions)
    .orderBy(submissions.id);
  const config = await getArtifactConfig();
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
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={wipe}
              >
                <Trash2 size={24} className="size-6 text-red-500" />
              </Button>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Submissions</SidebarGroupLabel>
            <SidebarMenu>
              <SubmissionList subs={subs} />
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarGroup>
            <SidebarGroupLabel>การตั้งค่า</SidebarGroupLabel>
            <LimitManager config={config} length={subs.length} />
          </SidebarGroup>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-transparent">{children}</SidebarInset>
    </SidebarProvider>
  );
}
