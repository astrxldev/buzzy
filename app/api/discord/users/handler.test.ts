import { expect, mock, test } from "bun:test";
import { createDiscordUsersHandler } from "./handler";

test("Discord users route serializes the service result", async () => {
  const getUsers = mock(async () => [{ uid: "1", display: "User" }]);
  const response = await createDiscordUsersHandler(getUsers)();
  expect(await response.json()).toEqual([{ uid: "1", display: "User" }]);
  expect(getUsers).toHaveBeenCalledTimes(1);
});
