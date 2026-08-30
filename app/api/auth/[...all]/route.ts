import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth"; // path to your auth file
import { createAuthHandlers } from "./handler";

export const { POST, GET } = createAuthHandlers(toNextJsHandler, auth);
