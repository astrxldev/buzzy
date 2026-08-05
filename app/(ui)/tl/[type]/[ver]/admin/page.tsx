import { notFound, redirect } from "next/navigation";
import { ViewTransition } from "react";
import { adminCheck } from "@/lib/auth";
import { getTierlistConfig } from "@/lib/tierlist";
import { TierList } from "../tierlist";

export default async function TierlistPage({
  params,
}: {
  params: Promise<{ type: string; ver: string }>;
}) {
  if (!(await adminCheck())) redirect("/login");
  const { type, ver } = await params;
  const config = await getTierlistConfig(type, ver);
  if (!config)
    // console.log(config);
    notFound();
  return (
    <ViewTransition update="none">
      <TierList editable {...config} />
    </ViewTransition>
  );
  // return <pre>{JSON.stringify(config, null, 2)}</pre>;
}
