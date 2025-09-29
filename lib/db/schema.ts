import {
    type AnyPgColumn,
    boolean,
    date,
    integer,
    pgEnum,
    pgSchema,
    pgTable,
    serial,
    text,
    timestamp,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
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
  type: text().notNull(),
  size: text().notNull(),
});

export const auditLog = pgTable("auditLog", {
  id: text().primaryKey().$defaultFn(uuidv7),
  text: text().notNull(), // Buzz deleted Raiden Shogun from Base 1.0
  time: date().notNull().defaultNow(),
});

export const characters = pgTable("characters", {
  id: text().primaryKey().$defaultFn(uuidv7),
  name: text().unique().notNull(), // Qiqi
  version: text()
    .notNull()
    .references(() => versions.id), // Li-A
  stars: integer().notNull().$type<4 | 5>(),
  vision: element().notNull(),
  image: text()
    .notNull()
    .references(() => cdn.id),
  weapon: text().notNull(),
  amber: text().notNull(), // Amber character ID
});

export const versions = pgTable("versions", {
  id: text().primaryKey(), // LI
  name: text().notNull(), // LunaI
  from: text().references((): AnyPgColumn => versions.id),
  // deprecate: date().notNull() // 21/03/2077
});

export const settings = pgTable("settings", {
  id: text().primaryKey().$defaultFn(uuidv7),
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
    .notNull()
    .references(() => characters.name),
  queue: serial(),
  checked: boolean().notNull().default(false),
});

export const artifactSettings = artifact.table("settings", {
  id: text().primaryKey().$defaultFn(uuidv7),
  locked: boolean().notNull().default(false),
  limit: integer().notNull().default(-1),
});

//#endregion

//#region Tierlist
export const tierlist = pgSchema("tierlist");

export const tierlistTypes = tierlist.table("types", {
  id: text().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  image: text()
    .notNull()
    .references(() => cdn.id),
});

export const tierlistTiers = tierlist.table("tiers", {
  id: text().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  image: text().references(() => cdn.id),
});

export const tierlistColumns = tierlist.table("columns", {
  id: text().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  image: text().references(() => cdn.id),
});

export const tierlistBadges = tierlist.table("badges", {
  id: text().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  image: text().references(() => cdn.id),
});

export const tierlistVersions = tierlist.table("versions", {
  id: text().primaryKey(),
  name: text().notNull(),
  hidden: boolean().notNull().default(false),
  type: text()
    .notNull()
    .references(() => tierlistTypes.id),
  image: text().references(() => cdn.id),
});

export const tierlistStates = tierlist.table("states", {
  uuid: text().primaryKey().$defaultFn(uuidv7),
  char: text()
    .notNull()
    .references(() => characters.id),
  list: text()
    .notNull()
    .references(() => tierlistVersions.id),
  tier: text()
    .notNull()
    .references(() => tierlistVersions.id),
  column: text()
    .notNull()
    .references(() => tierlistColumns.id),
  comment: text().notNull().default(""),
  badges: text()
    .references(() => tierlistBadges.id)
    .array(4)
    .default([]),
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
