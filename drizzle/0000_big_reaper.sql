CREATE TABLE "guest_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"full_name" text NOT NULL,
	"group_name" text,
	"max_attendees" integer DEFAULT 1 NOT NULL,
	"language" text DEFAULT 'es' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guests_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"attending" boolean NOT NULL,
	"num_attendees" integer DEFAULT 1 NOT NULL,
	"meal_preference" text,
	"dietary_restrictions" text,
	"notes" text,
	"responded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rsvps_guest_id_unique" UNIQUE("guest_id")
);
--> statement-breakpoint
ALTER TABLE "guest_messages" ADD CONSTRAINT "guest_messages_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;