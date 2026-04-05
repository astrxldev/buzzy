import type { Metadata } from "next";
import { searchGuide } from "./api";
import { GuideList } from "./client";

export const metadata: Metadata = {
  title: "ไกด์ตัวละคร",
  description: "ไกด์ปั้นตัวละครโดยเกนชินไม่ใช่เกมมือถือ",
};

export default async function GuidePage() {
  const initialData = await searchGuide("");
  return <GuideList initialList={initialData} />;
}

export const dynamic = "force-dynamic";
