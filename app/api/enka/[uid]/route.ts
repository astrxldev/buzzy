export const revalidate = 300; // 5 minutes

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  const { uid } = await params;
  return Response.json(
    await fetch(`https://enka.network/api/uid/${uid}?info`, {
      headers: { "User-Agent": "Buzz Event Platform" },
      next: {
        revalidate: 900, // refresh every 15 minutes
      },
      cache: "force-cache",
    }).then((e) => e.json()),
  );
}
