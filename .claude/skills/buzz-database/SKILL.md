---
name: buzz-database
description: Drizzle ORM workflows for the Buzz PostgreSQL database
metadata:
  author: dmgnr
  version: 1.0.0
---

# Buzz — Database Workflows (Drizzle ORM)

This skill covers working with the PostgreSQL database via Drizzle ORM.

## Schema Overview

All tables are defined in `lib/db/schema.ts`. The database uses **three named schemas** + the public schema:

### Public schema

| Table | Purpose |
|---|---|
| `cdn` | File storage (bytea), used for images, cards, slips |
| `auditLog` | Admin action audit trail |
| `characters` | Genshin characters (linked to versions, CDN images) |
| `versions` | Game version tracking (self-referencing FK for `from`) |
| `settings` | Global app settings (singleton row, PK is boolean `true`) |
| `guides` | Character build guide links |
| `user`, `session`, `account`, `verification` | Better-auth tables |

### `artifact` schema

| Table | Purpose |
|---|---|
| `submissions` | Artifact review queue submissions |
| `cards` | Generated character cards for submissions |
| `settings` | Artifact-specific settings (locked, limit) |

### `endgame` schema

| Table | Purpose |
|---|---|
| `submissions` | Rubgram (endgame) queue submissions |
| `sarchive` | Archived completed submissions |
| `expired` | Expired unpaid submissions |
| `slips` | SlipOK payment slip images and data |
| `settings` | Rubgram-specific settings |
| `discord` | Discord user mapping |
| `types` | Service types with pricing |

### `tierlist` schema

| Table | Purpose |
|---|---|
| `types` | Tierlist categories (Spiral Abyss, Stygian Onslaught) |
| `tiers` | Tier definitions (S, A, B, etc.) |
| `columns` | Column layout definitions |
| `badges` | Badge icons for tiers |
| `versions` | Tierlist versions per type |
| `states` | Character placements per version (JSONB badges) |

### Key schema patterns

**UUIDv7 primary keys:**
```ts
import { uuidv7 } from "uuidv7";

id: uuid("id").primaryKey().$defaultFn(uuidv7),
```

**Named schemas with `pgSchema`:**
```ts
import { pgSchema } from "drizzle-orm/pg-core";

const artifact = pgSchema("artifact");
export const submissions = artifact.table("submissions", { ... });
```

**Custom `bytea` column** (for binary data like images):
```ts
import { bytea } from "$/db/custom";
// used in: cdn, cards, slips tables
```

**Generated columns:**
```ts
paid: boolean().generatedAlwaysAs(
  sql`(price <= (0)::numeric) OR (slip IS NOT NULL)`
),
```

**Serial sequences** for queue numbering per schema:
```ts
queue: integer().notNull().default(sql`(nextval('artifact.submissions_queue_seq'::regclass))`),
```

**Enums:**
```ts
export const characterElement = pgEnum("character_element", [
  "anemo", "geo", "dendro", "hydro", "pyro", "cryo", "electro",
]);
```

**Foreign keys with cascade:**
```ts
char: uuid("char").notNull().references(() => characters.id, {
  onDelete: "cascade",
  onUpdate: "cascade",
}),
```

## Migration Workflow

### Important: database boundary

Schema changes must be pushed to the database **before** the new code deploys. Otherwise the running app will crash on startup when it queries tables or columns that don't exist yet.

| Environment | Command | Timing |
|---|---|---|
| **Dev** | `bun ds dr push` | Run inside app container (via `bun ds`) against dev DB |
| **Production** | `bun dr push` | Run locally with production env vars against prod DB. **Must run before `git push`.** |

### Full migration workflow

1. **Edit schema** in `lib/db/schema.ts`
2. **Generate migration files** (optional, for tracking):
   ```bash
   bun dr generate
   ```
3. **Push to dev** to verify:
   ```bash
   bun ds dr push
   ```
4. **If using migrate instead of push** for production:
   ```bash
   bun dr migrate
   ```
5. **Push to production DB** (with production credentials):
   ```bash
   bun dr push
   ```
6. **Deploy code** via `git push` (Gitea Actions handles the rest)

When using `bun dr push`, Drizzle automatically detects differences between the schema and the database, and applies the necessary ALTER statements. For production, always verify the SQL Drizzle generates first.

### Drizzle Studio

Accessible at `http://localhost:4983` when dev containers are running. The `drizzle` service in `dev/compose.yml` provides this:

```bash
bun ds bun dr studio --host $(hostname)
```

## Common Schema Operations

### Adding a column

```ts
// In the table definition, add:
newColumn: varchar("new_column", { length: 255 }).default(""),
```

Generate + push.

### Adding a new table

```ts
export const myTable = pgSchema("myschema").table("my_table", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  name: varchar("name", { length: 255 }).notNull(),
  // ...
});
```

Export and use in queries. Generate + push.

### Adding a new enum

```ts
export const myEnum = pgEnum("my_enum", ["value1", "value2"]);

export const myTable = pgSchema("myschema").table("my_table", {
  status: myEnum("status").default("value1"),
});
```

### Adding foreign key

```ts
refId: uuid("ref_id")
  .notNull()
  .references(() => otherTable.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
```

## Query patterns

### Basic select
```ts
import { db } from "$/db";
import { submissions } from "$/db/schema";
import { eq } from "drizzle-orm";

const items = await db.select().from(submissions).where(eq(submissions.checked, false));
```

### Select with join
```ts
const result = await db
  .select({
    name: characters.name,
    queue: submissions.queue,
  })
  .from(submissions)
  .innerJoin(characters, eq(submissions.char, characters.id))
  .orderBy(submissions.queue);
```

### Insert
```ts
const [inserted] = await db
  .insert(submissions)
  .values({ name: "Test", uid: "123456789", char: charId })
  .returning({ id: submissions.id, queue: submissions.queue });
```

### Update
```ts
await db
  .update(submissions)
  .set({ checked: true })
  .where(eq(submissions.id, id));
```

### Delete with cascade check (CDN)
```ts
// Use checkCdnRefs() from $api before deleting CDN files
```

### Raw SQL
```ts
import { sql } from "drizzle-orm";

await db.execute(sql`ALTER SEQUENCE artifact.submissions_queue_seq RESTART WITH 1`);
```

### Transactions
```ts
await db.transaction(async (tx) => {
  await tx.insert(...);
  await tx.update(...);
});
```

### Counting
```ts
const count = await db.$count(submissions);
```
