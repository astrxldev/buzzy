import { isNotNull, lte, or, type SQL, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import type { SlipokResponse } from "@/app/(ui)/rubgram/api";
import { bytea } from "./custom";

export const element = pgEnum("character_element", [
  "anemo",
  "geo",
  "dendro",
  "hydro",
  "pyro",
  "cryo",
  "electro",
]);

// #region Shared
export const cdn = pgTable("cdn", {
  id: text().primaryKey().$defaultFn(uuidv7),
  data: bytea().notNull(),
  name: text(),
  type: text().notNull(),
  size: text().notNull(),
});

export const auditLog = pgTable("auditLog", {
  id: text().primaryKey().$defaultFn(uuidv7),
  author: text(), // Buzz
  text: text().notNull(), // deleted Raiden Shogun from Base 1.0
  details: jsonb(),
  time: timestamp().notNull().defaultNow(),
});

export const characters = pgTable("characters", {
  id: text().primaryKey().$defaultFn(uuidv7),
  name: text().unique().notNull(), // Qiqi
  version: text()
    .notNull()
    .references(() => versions.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }), // Li-A
  stars: integer().notNull().$type<4 | 5>(),
  vision: element().notNull(),
  image: text()
    .notNull()
    .references(() => cdn.id, { onUpdate: "cascade" }),
  weapon: text().notNull(),
  amber: text().notNull(), // Amber character ID
  order: integer().notNull(),
});

export const versions = pgTable("versions", {
  id: text().primaryKey(), // LI
  name: text().notNull(), // LunaI
  from: text().references((): AnyPgColumn => versions.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  // deprecate: date().notNull() // 21/03/2077
});

export const settings = pgTable("settings", {
  id: boolean().primaryKey().default(true),
  enka: boolean().notNull().default(false), // Turn this off when Enka is on maintenance
});

//#endregion

//#region Artifact
export const artifact = pgSchema("artifact");

export const submissions = artifact.table("submissions", {
  id: text().primaryKey().$defaultFn(uuidv7),
  uid: text().notNull().unique(),
  name: text().notNull(),
  comment: text().notNull(),
  char: text()
    // .notNull() // For Special Queue
    .references(() => characters.name, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  queue: serial(), // NULL for Spacial Queue
  editToken: text().notNull().$defaultFn(uuidv7),
  edits: integer().notNull().default(0),
  checked: boolean().notNull().default(false),
});

export const cards = artifact.table("cards", {
  id: text().primaryKey().$defaultFn(uuidv7),
  submission: text()
    .references(() => submissions.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  tries: integer().notNull().default(0),
  error: text(),
  image: bytea(),
});

export const artifactSettings = artifact.table("settings", {
  id: boolean().primaryKey().default(true),
  locked: boolean().notNull().default(false),
  limit: integer().notNull().default(-1),
});

//#endregion

//#region Endgame
export const endgame = pgSchema("endgame");

export const endgameServer = endgame.enum("server", ["as", "eu", "us", "tw"]);

export const endgameSubmissions = endgame.table("submissions", {
  id: text().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  user: text()
    .notNull()
    .references(() => endgameDiscord.uid, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  expires: timestamp().$defaultFn(() => new Date(Date.now() + 20 * 60 * 1000)), // 20 minutes to pay
  queue: serial(),
  server: endgameServer().notNull(),
  service: text()
    .references(() => endgameTypes.id)
    .array()
    .notNull(),
  price: integer().notNull(), // calculated on submission
  slip: text().references(() => endgameSlips.id), // not paid = null
  checked: boolean().notNull().default(false),
  paid: boolean()
    .notNull()
    .generatedAlwaysAs(
      (): SQL =>
        or(
          lte(endgameSubmissions.price, sql.raw("0")),
          isNotNull(endgameSubmissions.slip),
        )!,
    ),
  archived: boolean().notNull().default(false),
});

export const endgameArchive = endgame.table("sarchive", {
  id: text().primaryKey(),
  name: text().notNull(),
  user: text().notNull(),
  queue: integer().notNull(),
  price: integer().notNull(),
  slip: text().references(() => endgameSlips.id),
  round: integer().notNull(),
  service: text()
    .references(() => endgameTypes.id)
    .array()
    .notNull(),
});

// expired submission
export const endgameExpired = endgame.table("expired", {
  id: text().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  user: text()
    .notNull()
    .references(() => endgameDiscord.uid, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  server: endgameServer().notNull(),
  service: text()
    .references(() => endgameTypes.id)
    .array()
    .notNull(),
});

export const endgameSlips = endgame.table("slips", {
  id: text().primaryKey().$defaultFn(uuidv7),
  slip: bytea().notNull(),
  ref: text().unique().notNull(),
  amount: numeric().notNull(),
  data: jsonb().$type<SlipokResponse>().notNull(),
});

export const endgameSettings = endgame.table("settings", {
  id: boolean().primaryKey().default(true),
  locked: boolean().notNull().default(false),
  limit: integer().notNull().default(-1),
  free: integer().notNull().default(0),
  allDiscount: integer().notNull().default(10),
});

export const endgameDiscord = endgame.table("discord", {
  uid: text().primaryKey(), // user snowflake
  display: text().notNull(),
  username: text().notNull(),
  token: text().notNull().$defaultFn(uuidv7), // for accessing existing user with cookie.
});

export const endgameTypes = endgame.table("types", {
  id: text().primaryKey(), // theater
  display: text().notNull(), // โรงละครในจินตนาการ
  price: integer().notNull(), // 100
  order: serial().notNull(),
});

//#endregion

//#region Tierlist
export const tierlist = pgSchema("tierlist");

export const tierlistTypes = tierlist.table("types", {
  id: text().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  image: text().references(() => cdn.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  order: integer().notNull(),
  mode: text().notNull(),
});

export const tierlistTiers = tierlist.table("tiers", {
  id: text().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  badges: text()
    .references(() => tierlistBadges.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    })
    .array(),
  image: text().references(() => cdn.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  order: integer().notNull(),
});

export const tierlistColumns = tierlist.table("columns", {
  id: text().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  image: text().references(() => cdn.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  order: integer().notNull(),
});

export const tierlistBadges = tierlist.table("badges", {
  id: text().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  image: text().references(() => cdn.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  order: integer().notNull(),
  type: text().references(() => tierlistTypes.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
});

export const tierlistVersions = tierlist.table("versions", {
  id: text().primaryKey(),
  name: text().notNull(),
  hidden: boolean().notNull().default(false),
  type: text()
    .notNull()
    .references(() => tierlistTypes.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  image: text().references(() => cdn.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  disclaimer: text().references(() => cdn.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  deprecates: text().notNull(),
  from: text()
    .notNull()
    .references(() => versions.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  order: integer().notNull(),
  placements: jsonb().notNull().$type<{ [x: string]: string[] }>().default({}),
});

export const tierlistStates = tierlist.table("states", {
  uuid: text().primaryKey().$defaultFn(uuidv7),
  char: text()
    .notNull()
    .references(() => characters.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  ref: text().notNull(), // for manually created tiles, the id would be char#Date.now() instead
  list: text()
    .notNull()
    .references(() => tierlistVersions.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  comment: text().notNull().default(""),
  badges: text()
    .references(() => tierlistBadges.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .array(4)
    .default([]),
});

//#endregion

//#region Guide
export const guides = pgTable("guides", {
  id: text().primaryKey().$defaultFn(uuidv7),
  image: text().references(() => cdn.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  order: integer().notNull(),
  link: text().notNull(),
  hidden: boolean().notNull().default(false),
  name: text().notNull(),
});

//#endregion

//#region Donate
export const schDonate = pgSchema("donate");

export const donations = schDonate.table("donations", {
  id: text().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  amount: numeric({ mode: "number", precision: 7, scale: 2 }).notNull(),
  image: bytea(),
  message: text(),
  created: timestamp("created_at").defaultNow().notNull(),
  // The retry system
  lastPing: timestamp("last_ping").default(new Date("01-01-2000")).notNull(),
  sent: boolean().default(false).notNull(),
  uid: text(),
});

//#endregion

//#region Better Auth
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

//#endregion
