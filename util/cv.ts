import { file, Glob, write } from "bun";
import { rm } from "node:fs/promises";

const g = new Glob("public/bgassets/*.png");

for await (const img of g.scan()) {
  file(img)
    .image()
    .webp()
    .buffer()
    .then((b) => write(img.replace(".png", ".webp"), b))
    .then(() => rm(img))
    .finally(() => console.log(img, "processed."));
}
