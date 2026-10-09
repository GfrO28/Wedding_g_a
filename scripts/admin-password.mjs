// Cambia la contraseña de una persona del panel directamente en la base
// (por si nadie puede entrar). Uso:  node scripts/admin-password.mjs
// Pide el correo y la contraseña nueva por la terminal; cierra sus sesiones.
import { readFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { neon } from "@neondatabase/serverless";

const envText = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = envText.match(/^DATABASE_URL="?([^"\n]*)"?/m)?.[1];
if (!url) throw new Error("No encontré DATABASE_URL en .env");
const sql = neon(url);

const rl = createInterface({ input: stdin, output: stdout });
const email = (await rl.question("Correo: ")).trim().toLowerCase();
const [user] = await sql`SELECT id, name FROM admin_users WHERE email = ${email}`;
if (!user) {
  console.log("Ese correo no tiene acceso al panel.");
  process.exit(1);
}
const password = await rl.question("Contraseña nueva (mínimo 10 caracteres): ");
rl.close();
if (password.length < 10) {
  console.log("Tiene que tener al menos 10 caracteres.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = `scrypt$${salt.toString("base64url")}$${scryptSync(password, salt, 64).toString("base64url")}`;
await sql`UPDATE admin_users SET password_hash = ${hash}, setup_token_hash = NULL, setup_expires_at = NULL WHERE id = ${user.id}`;
await sql`DELETE FROM admin_sessions WHERE user_id = ${user.id}`;
await sql`DELETE FROM admin_devices WHERE user_id = ${user.id}`;
await sql`INSERT INTO audit_log (user_id, user_name, action, ip) VALUES (${user.id}, ${user.name}, 'Cambió su contraseña desde la terminal', 'terminal')`;
console.log(`Listo: ${user.name} ya puede entrar con la contraseña nueva.`);
