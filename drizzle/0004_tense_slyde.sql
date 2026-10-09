ALTER TABLE "gift_contributions" ADD COLUMN "received" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_items" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "gift_items" ADD COLUMN "link" text;--> statement-breakpoint
ALTER TABLE "gift_items" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_items" ADD COLUMN "visible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "table_name" text;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "opened_at" timestamp with time zone;