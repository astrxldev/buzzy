import { Glob } from "bun";

const g = new Glob("public/bgassets/*.png");

for await (const img of g.scan()) {
  Bun.file(img)
    .image()
    .webp()
    .buffer()
    .then((b) => Bun.write(img.replace(".png", ".webp"), b))
    .finally(() => console.log(img, "processed."));
}
