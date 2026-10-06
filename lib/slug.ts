export function makeSlug(fullName: string) {
  const base = fullName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const suffix = crypto.randomUUID().slice(0, 6);
  return `${base}-${suffix}`;
}
