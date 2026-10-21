import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { isSlipProvider, verifySlip } from "@/lib/slip-checker";

export async function getSlipProvider() {
  const [config] = await db
    .select({ provider: settings.slipCheckProvider })
    .from(settings)
    .where(eq(settings.id, true));
  const provider = config?.provider ?? "slipok";
  if (!isSlipProvider(provider))
    throw new Error("Invalid slip provider setting.");
  return provider;
}

export async function checkSlip(
  buffer: Buffer<ArrayBuffer>,
  type: string,
  amount: number,
) {
  const provider = await getSlipProvider();
  return verifySlip(provider, buffer, type, amount);
}
