ALTER TABLE "gift_items" ALTER COLUMN "type" SET DEFAULT 'fund';--> statement-breakpoint
ALTER TABLE "gift_contributions" ADD COLUMN "guest_id" uuid;--> statement-breakpoint
ALTER TABLE "gift_contributions" ADD COLUMN "operation_number" text;--> statement-breakpoint
ALTER TABLE "gift_contributions" ADD COLUMN "receipt_key" text;--> statement-breakpoint
ALTER TABLE "gift_contributions" ADD COLUMN "message" text;--> statement-breakpoint
ALTER TABLE "gift_items" ADD COLUMN "close_on_goal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_contributions" ADD CONSTRAINT "gift_contributions_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "gift_items" SET "type" = 'fund';
