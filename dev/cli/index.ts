import { parseArgs } from "node:util";

parseArgs({
  args: Bun.argv,
  options: {
    flag1: {
      type: "boolean",
    },
    flag2: {
      type: "string",
    },
  },
  strict: true,
  allowPositionals: true,
});

// very wip
