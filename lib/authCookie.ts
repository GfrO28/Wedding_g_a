// Lo que necesita el proxy (sin base de datos): el nombre de la cookie de la
// sesión y su forma (un código al azar de 43 caracteres en base64url).
export const COOKIE_NAME = "admin_session";
export const looksLikeSession = (v: string | undefined) => !!v && /^[A-Za-z0-9_-]{43}$/.test(v);
