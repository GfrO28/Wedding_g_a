ALTER TABLE "admin_users" ADD COLUMN "role" text DEFAULT 'editor' NOT NULL;--> statement-breakpoint
-- La primera persona con acceso (quien instaló el panel) queda como principal.
UPDATE "admin_users" SET "role" = 'owner' WHERE "id" = (SELECT "id" FROM "admin_users" ORDER BY "created_at" LIMIT 1);
