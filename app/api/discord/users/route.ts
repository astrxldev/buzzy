import { getDiscordUsers } from "./api";
import { createDiscordUsersHandler } from "./handler";

export const GET = createDiscordUsersHandler(getDiscordUsers);
