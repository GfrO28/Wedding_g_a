export function makeSlug(fullName: string) {
  const base = fullName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // 10 caracteres al azar: el link no se puede adivinar.
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  return `${base}-${suffix}`;
}
