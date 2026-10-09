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

// Cada regalo recibe aportes de los invitados hasta su meta (amount, opcional:
// sin meta es un aporte libre). type, claimedByName y claimedAt son de cuando
// existían las reservas: ya no se usan (quedan para no romper datos viejos).
export const giftItems = pgTable("gift_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("fund"),
  amount: integer("amount"),
  // Moneda del regalo ("PEN" o "USD"): en esa moneda se muestra y se aporta.
  currency: text("currency").notNull().default("PEN"),
  claimedByName: text("claimed_by_name"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  imageUrl: text("image_url"),
  link: text("link"), // tienda donde se compra (opcional)
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  // Al llegar a la meta deja de recibir aportes (si no, sigue abierto).
  closeOnGoal: boolean("close_on_goal").notNull().default(false),
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
  // La invitación desde la que se avisó el aporte.
  guestId: uuid("guest_id").references(() => guests.id, { onDelete: "set null" }),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("PEN"),
  operationNumber: text("operation_number"),
  // Foto de la constancia en el almacenamiento (clave, no URL: solo la ve el panel).
  receiptKey: text("receipt_key"),
  message: text("message"),
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
// cookie guarda un código al azar y aquí solo su huella (sha-256).
// Personas con acceso al panel (los novios). La contraseña se guarda con scrypt;
// queda vacía hasta que la persona acepta la invitación y elige la suya.
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  // "owner": acceso total (personas, registro, avisos) · "editor": todo el panel menos eso.
  role: text("role").notNull().default("editor"),
  // Enlace para elegir contraseña (invitación u «olvidé mi contraseña»).
  setupTokenHash: text("setup_token_hash"),
  setupExpiresAt: timestamp("setup_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

// Dispositivos confirmados con el código por correo: no lo vuelven a pedir por un tiempo.
export const adminDevices = pgTable("admin_devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => adminUsers.id, { onDelete: "cascade" }),
  // Al cerrar la sesión se olvida también su dispositivo (vuelve a pedir código).
  deviceId: uuid("device_id").references(() => adminDevices.id, { onDelete: "set null" }),
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

// Ingreso a medio camino: clave correcta, falta el código que llegó por correo.
export const loginChallenges = pgTable("login_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// Registro de cambios: quién hizo qué en el panel.
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => adminUsers.id, { onDelete: "set null" }),
  userName: text("user_name"),
  action: text("action").notNull(),
  detail: text("detail"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
