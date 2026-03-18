import { searchGuide } from "./api";
import { GuideList } from "./client";

export default async function GuidePage() {
  const initialData = await searchGuide("");
  return <GuideList initialList={initialData} />;
}
