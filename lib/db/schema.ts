import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const guests = pgTable("guests", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  fullName: text("full_name").notNull(),
  groupName: text("group_name"),
  maxAttendees: integer("max_attendees").notNull().default(1),
  language: text("language").notNull().default("es"),
  phone: text("phone"),
  email: text("email"),
  tableName: text("table_name"),
  notes: text("notes"),
  // Primera vez que el invitado abrió su enlace personal.
  openedAt: timestamp("opened_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rsvps = pgTable("rsvps", {
  id: uuid("id").primaryKey().defaultRandom(),
  guestId: uuid("guest_id")
    .notNull()
    .unique()
    .references(() => guests.id, { onDelete: "cascade" }),
  attending: boolean("attending").notNull(),
  numAttendees: integer("num_attendees").notNull().default(1),
  mealPreference: text("meal_preference"),
  dietaryRestrictions: text("dietary_restrictions"),
  notes: text("notes"),
  respondedAt: timestamp("responded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const guestMessages = pgTable("guest_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  guestId: uuid("guest_id").references(() => guests.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  message: text("message").notNull(),
  approved: boolean("approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const photos = pgTable("photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  url: text("url").notNull(),
  alt: text("alt"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// type "claim": un invitado reserva el regalo entero (amount = monto sugerido).
// type "fund": varios invitados aportan montos parciales (amount = monto objetivo).
export const giftItems = pgTable("gift_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("claim"),
  amount: integer("amount"),
  claimedByName: text("claimed_by_name"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  imageUrl: text("image_url"),
  link: text("link"), // tienda donde se compra (opcional)
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const giftContributions = pgTable("gift_contributions", {
  id: uuid("id").primaryKey().defaultRandom(),
  giftItemId: uuid("gift_item_id")
    .notNull()
    .references(() => giftItems.id, { onDelete: "cascade" }),
  contributorName: text("contributor_name").notNull(),
  amount: integer("amount").notNull(),
  // Los novios confirmaron que el dinero llegó.
  received: boolean("received").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// Sesiones del panel de novios: cada ingreso crea una, con vencimiento. La
// cookie guarda un código al azar y acá solo su huella (sha-256).
export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  userAgent: text("user_agent"),
  ip: text("ip"),
});

// Intentos de ingreso (para bloquear después de varios fallidos seguidos).
export const loginAttempts = pgTable("login_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  ip: text("ip").notNull(),
  success: boolean("success").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
