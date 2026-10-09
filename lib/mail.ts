import nodemailer, { type Transporter } from "nodemailer";

// Correos del panel (códigos, avisos, invitaciones) desde la cuenta de Gmail
// configurada con una contraseña de aplicación:
//   GMAIL_USER="cuenta@gmail.com"  GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
// Sin esas variables, en desarrollo el correo se escribe en la consola; en
// producción es un error (sin correo no se puede confirmar un dispositivo nuevo).

export const mailConfigured = () => !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;

let transport: Transporter | null = null;

export async function sendMail(to: string | string[], subject: string, lines: string[]) {
  const text = lines.join("\n");
  if (!mailConfigured()) {
    if (process.env.NODE_ENV === "production") throw new Error("El envío de correos no está configurado (GMAIL_USER / GMAIL_APP_PASSWORD).");
    console.log(`[correo] para: ${[to].flat().join(", ")} · ${subject}\n${text}\n[/correo]`);
    return;
  }
  transport ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s/g, "") },
  });
  await transport.sendMail({
    from: { name: "Panel Antonella & Gianfranco", address: process.env.GMAIL_USER! },
    to,
    subject,
    text,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#221A1C">${lines
      .map((l) => (l ? `<p style="margin:0 0 10px">${escapeHtml(l)}</p>` : ""))
      .join("")}</div>`,
  });
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
