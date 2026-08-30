import { redis } from "bun";
import { createEnkaHandler } from "./handler";

export const revalidate = 300; // 5 minutes

export const GET = createEnkaHandler({ redis, fetch });
