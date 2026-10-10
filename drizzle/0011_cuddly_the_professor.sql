CREATE TABLE "guest_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"name" text,
	"companion" boolean DEFAULT false NOT NULL,
	"attending" boolean,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "pass_type" text DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "pass_token" text;--> statement-breakpoint
ALTER TABLE "guest_members" ADD CONSTRAINT "guest_members_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_pass_token_unique" UNIQUE("pass_token");--> statement-breakpoint
-- Cada invitación existente: su titular como primera persona, y un código de pase.
INSERT INTO "guest_members" ("guest_id", "name", "sort_order") SELECT "id", "full_name", 0 FROM "guests";--> statement-breakpoint
UPDATE "guests" SET "pass_token" = replace(gen_random_uuid()::text, '-', '') WHERE "pass_token" IS NULL;
