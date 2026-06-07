import { eq } from "drizzle-orm";
import { after, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cards, characters, submissions } from "@/lib/db/schema";

export async function GET(
  _req: NextRequest,
  { params }: RouteContext<"/api/card/[sub]">,
) {
  const { sub: subId } = await params;
  const [[sub], [image]] = await Promise.all([
    db.select().from(submissions).where(eq(submissions.id, subId)),
    db.select().from(cards).where(eq(cards.submission, subId)),
  ]);
  if (image?.image) return new Response(new Uint8Array(image.image));
  const [char] = await db
    .select()
    .from(characters)
    .where(eq(characters.name, sub.char ?? "THISISNULLANDNOTSUPPOSEDTOMATCH"));
  if (!char)
    return new Response(`Unknown character: ${sub.char}`, { status: 500 });
  const card = await fetch(
    `http://mts.dgnr.us:8809/v1/card/genshin/${sub.uid}/${char.amber.split("-")[0]}?lang=th&substat=true&quality=true`,
  );
  if (!card.ok) return card;
  const fresh = await card.arrayBuffer();
  after(async () => {
    await db
      .insert(cards)
      .values({
        image: Buffer.from(fresh),
        submission: subId,
      })
      .onConflictDoUpdate({
        target: cards.submission,
        set: {
          image: Buffer.from(fresh),
        },
      });
  });
  return new Response(fresh);
}
