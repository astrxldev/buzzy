import generate from "@/lib/og";

// Image metadata
export const size = {
  width: 1222,
  height: 560,
};

export const contentType = "image/png";

// Image generation
export default async function Image() {
  return generate({ title: "รับกรรมแทนทางบ้าน", sub: "" });
}

export const dynamic = "force-dynamic";
