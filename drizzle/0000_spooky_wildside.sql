CREATE SCHEMA "artifact";
--> statement-breakpoint
CREATE SCHEMA "tierlist";
--> statement-breakpoint
CREATE TYPE "public"."character_element" AS ENUM('anemo', 'geo', 'dendro', 'hydro', 'pyro', 'cryo');--> statement-breakpoint
CREATE TABLE "artifact"."settings" (
	"id" text PRIMARY KEY NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"limit" integer DEFAULT -1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditLog" (
	"id" text PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"time" date DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cdn" (
	"id" text PRIMARY KEY NOT NULL,
	"data" "bytea" NOT NULL,
	"type" text NOT NULL,
	"size" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"stars" integer NOT NULL,
	"vision" character_element NOT NULL,
	"image" text NOT NULL,
	"weapon" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY NOT NULL,
	"enka" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifact"."submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"comment" text NOT NULL,
	"char" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tierlist"."badges" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image" text
);
--> statement-breakpoint
CREATE TABLE "tierlist"."columns" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image" text
);
--> statement-breakpoint
CREATE TABLE "tierlist"."states" (
	"uuid" text PRIMARY KEY NOT NULL,
	"char" text NOT NULL,
	"list" text NOT NULL,
	"tier" text NOT NULL,
	"column" text NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"badges" text[4] DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "tierlist"."tiers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image" text
);
--> statement-breakpoint
CREATE TABLE "tierlist"."types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tierlist"."versions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "versions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"from" text
);
--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_version_versions_id_fk" FOREIGN KEY ("version") REFERENCES "public"."versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_image_cdn_id_fk" FOREIGN KEY ("image") REFERENCES "public"."cdn"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tierlist"."badges" ADD CONSTRAINT "badges_image_cdn_id_fk" FOREIGN KEY ("image") REFERENCES "public"."cdn"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tierlist"."columns" ADD CONSTRAINT "columns_image_cdn_id_fk" FOREIGN KEY ("image") REFERENCES "public"."cdn"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tierlist"."states" ADD CONSTRAINT "states_char_characters_id_fk" FOREIGN KEY ("char") REFERENCES "public"."characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tierlist"."states" ADD CONSTRAINT "states_list_versions_id_fk" FOREIGN KEY ("list") REFERENCES "tierlist"."versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tierlist"."states" ADD CONSTRAINT "states_tier_versions_id_fk" FOREIGN KEY ("tier") REFERENCES "tierlist"."versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tierlist"."states" ADD CONSTRAINT "states_column_columns_id_fk" FOREIGN KEY ("column") REFERENCES "tierlist"."columns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tierlist"."tiers" ADD CONSTRAINT "tiers_image_cdn_id_fk" FOREIGN KEY ("image") REFERENCES "public"."cdn"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tierlist"."types" ADD CONSTRAINT "types_image_cdn_id_fk" FOREIGN KEY ("image") REFERENCES "public"."cdn"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versions" ADD CONSTRAINT "versions_from_versions_id_fk" FOREIGN KEY ("from") REFERENCES "public"."versions"("id") ON DELETE no action ON UPDATE no action;