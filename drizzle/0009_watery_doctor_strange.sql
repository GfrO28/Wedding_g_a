ALTER TABLE "gift_contributions" ADD COLUMN "currency" text DEFAULT 'PEN' NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_items" ADD COLUMN "currency" text DEFAULT 'PEN' NOT NULL;