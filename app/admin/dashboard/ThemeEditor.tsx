import type { Theme } from "@/lib/theme";
import { resetThemeAction, updateThemeAction } from "./theme-actions";

const FIELDS: { key: keyof Theme; label: string }[] = [
  { key: "background", label: "Fondo" },
  { key: "foreground", label: "Texto principal" },
  { key: "muted", label: "Texto secundario" },
  { key: "border", label: "Bordes / fondos sutiles" },
  { key: "accent", label: "Acento (botones)" },
  { key: "accentForeground", label: "Texto sobre el acento" },
];

export function ThemeEditor({ theme }: { theme: Theme }) {
  return (
    <form
      action={updateThemeAction}
      className="flex flex-wrap items-end gap-4 rounded-lg border border-neutral-200 p-4"
    >
      {FIELDS.map((field) => (
        <div key={field.key} className="flex flex-col items-center gap-1">
          <label className="text-xs text-neutral-500">{field.label}</label>
          <input
            type="color"
            name={field.key}
            defaultValue={theme[field.key]}
            className="h-10 w-14 cursor-pointer rounded border border-neutral-300"
          />
        </div>
      ))}
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Guardar paleta
        </button>
        <button
          type="submit"
          formAction={resetThemeAction}
          className="rounded-md border border-neutral-300 px-4 py-1.5 text-sm hover:bg-neutral-100"
        >
          Restablecer
        </button>
      </div>
    </form>
  );
}
