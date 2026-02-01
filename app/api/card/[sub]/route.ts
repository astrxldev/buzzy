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
  if (image && image.image) return new Response(new Uint8Array(image.image));
  const [char] = await db
    .select()
    .from(characters)
    .where(eq(characters.name, sub.char));
  if (!char)
    return new Response(`Unknown character: ${sub.char}`, { status: 500 });
  const card = await fetch(
    `https://cards.enka.network/u/${sub.uid}/${char.amber}/image`,
  );
  if (!card.ok) return card;
  const fresh = await card.arrayBuffer();
  after(async () => {
    await db.insert(cards).values({
      image: Buffer.from(fresh),
      submission: subId,
    });
  });
  return new Response(fresh);
}
