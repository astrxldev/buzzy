export const revalidate = 3600;

export async function GET() {
  return new Response(await fetch("https://gi.yatta.moe/api/v2/en/avatar").then(e => e.text()), {
    headers: {
      "Content-Type": "application/json"
    }
  });
}
