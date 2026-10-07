"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Check, ExternalLink, Loader2, PanelRightClose, PanelRightOpen } from "lucide-react";
import type { EnvelopeSlot } from "@/lib/envelopeAssets";
import { applyStyles, LAYOUT_SECTIONS, pickStyle, type LayoutSection, type TextLayout, type TextStyle, type TokenValues } from "@/lib/textLayout";
import { ArtboardEditor, type CanvasCover } from "./ArtboardEditor";
import { ENVELOPE_BG, EnvelopeCard, EnvelopeClosed } from "./EnvelopeCanvas";
import { EnvelopeImagesPanel } from "./EnvelopeImagesPanel";
import { discardDraftsAction, publishAction, saveDraftAction, saveStylesDraftAction } from "./layout-actions";
import { StylesPanel } from "./StylesPanel";
import { toggleZoneEnabledAction } from "./zone-actions";

export type EditorSection = {
  id: string;
  label: string;
  group: "sections" | "general";
  zone?: string; // clave del interruptor visible/oculta
  enabled?: boolean;
  design?: LayoutSection; // tiene lienzo
  background?: { color: string; image?: string | null; overlay?: boolean };
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function EditorShell({
  sections,
  panels,
  blocks,
  published,
  drafts,
  styles: initialStyles,
  tokens,
  envelope,
}: {
  sections: EditorSection[];
  panels: Record<string, ReactNode>;
  blocks: Record<string, Record<string, ReactNode>>;
  published: Record<LayoutSection, TextLayout>;
  drafts: Record<LayoutSection, TextLayout>;
  styles: { published: TextStyle[]; draft: TextStyle[] };
  tokens: TokenValues;
  envelope: { assets: Record<EnvelopeSlot, string>; custom: Record<EnvelopeSlot, boolean> };
}) {
  const [currentId, setCurrentId] = useState(sections[0].id);
  const [layouts, setLayouts] = useState(drafts);
  const [publishedState, setPublishedState] = useState(published);
  const [styles, setStyles] = useState(initialStyles.draft);
  const [publishedStyles, setPublishedStyles] = useState(initialStyles.published);
  const pendingStyles = useRef<TextStyle[] | null>(null);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(sections.filter((s) => s.zone).map((s) => [s.id, s.enabled ?? true])),
  );
  // El sobre abre con sus imágenes a la vista: es lo primero que se busca ahí.
  const [contentOpen, setContentOpen] = useState(sections[0].id === "intro");
  const [envelopeAssets, setEnvelopeAssets] = useState(envelope.assets);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const pending = useRef(new Map<LayoutSection, TextLayout>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = sections.find((s) => s.id === currentId)!;
  const unpublished = (s: LayoutSection) => JSON.stringify(layouts[s]) !== JSON.stringify(publishedState[s]);
  const stylesUnpublished = JSON.stringify(styles) !== JSON.stringify(publishedStyles);
  const anyUnpublished = stylesUnpublished || sections.some((s) => s.design && unpublished(s.design));

  // Cuántos textos usan cada estilo (en todas las secciones y formatos).
  const styleUsage = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of LAYOUT_SECTIONS)
      for (const list of [layouts[s].portrait, layouts[s].landscape])
        for (const e of list) if (e.kind === "text" && e.style) out[e.style] = (out[e.style] ?? 0) + 1;
    return out;
  }, [layouts]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const items = [...pending.current.entries()];
    pending.current.clear();
    const st = pendingStyles.current;
    pendingStyles.current = null;
    if (!items.length && !st) return true;
    setSaveState("saving");
    try {
      const results = await Promise.all([
        ...items.map(([s, l]) => saveDraftAction(s, l)),
        ...(st ? [saveStylesDraftAction(st)] : []),
      ]);
      const ok = results.every((r) => r.ok);
      setSaveState(ok ? "saved" : "error");
      return ok;
    } catch {
      setSaveState("error");
      return false;
    }
  }, []);

  // Guardado automático: cada cambio se guarda como borrador después de una pausa corta.
  const handleChange = useCallback(
    (section: LayoutSection, layout: TextLayout) => {
      setLayouts((prev) => (prev[section] === layout ? prev : { ...prev, [section]: layout }));
      pending.current.set(section, layout);
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 800);
    },
    [flush],
  );
  const handleStylesChange = useCallback(
    (next: TextStyle[]) => {
      setStyles(next);
      pendingStyles.current = next;
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 800);
    },
    [flush],
  );

  // Al borrar un estilo, sus textos se quedan como se veían, pero sin estilo.
  function deleteStyle(id: string) {
    const style = styles.find((s) => s.id === id);
    if (!style) return;
    for (const s of LAYOUT_SECTIONS) {
      const l = layouts[s];
      if (![...l.portrait, ...l.landscape].some((e) => e.style === id)) continue;
      const unlink = (list: TextLayout["portrait"]) => list.map((e) => (e.style === id ? { ...e, ...pickStyle(style), style: null } : e));
      handleChange(s, { portrait: unlink(l.portrait), landscape: unlink(l.landscape) });
    }
    handleStylesChange(styles.filter((s) => s.id !== id));
  }

  const design = current.design;
  const onDesignChange = useCallback((l: TextLayout) => design && handleChange(design, l), [design, handleChange]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current.size || pendingStyles.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  async function publish() {
    setPublishing(true);
    setNotice(null);
    const saved = await flush();
    if (!saved) {
      setPublishing(false);
      setNotice("No se pudo guardar el borrador. Revisá tu conexión y probá de nuevo.");
      return;
    }
    const res = await publishAction();
    setPublishing(false);
    if (res.ok) {
      setPublishedState(layouts);
      setPublishedStyles(styles);
      setNotice("Publicado: los invitados ya ven estos cambios.");
    } else setNotice("No se pudo publicar. Probá de nuevo.");
  }

  async function discard() {
    if (!window.confirm("¿Descartar los cambios sin publicar? El diseño vuelve a lo que ven los invitados.")) return;
    if (timer.current) clearTimeout(timer.current);
    pending.current.clear();
    pendingStyles.current = null;
    await discardDraftsAction();
    setLayouts(publishedState);
    setStyles(publishedStyles);
    setVersion((v) => v + 1);
    setSaveState("idle");
    setNotice("Se descartaron los cambios sin publicar.");
  }

  async function toggleZone(s: EditorSection) {
    if (!s.zone) return;
    const next = !enabled[s.id];
    setEnabled((e) => ({ ...e, [s.id]: next }));
    await toggleZoneEnabledAction(s.zone, next);
  }

  const contentToggle = (
    <button
      type="button"
      onClick={() => setContentOpen((o) => !o)}
      aria-pressed={contentOpen}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${contentOpen ? "bg-neutral-900 text-white" : "border border-neutral-300 hover:bg-neutral-50"}`}
    >
      {contentOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />} {current.id === "intro" ? "Imágenes del sobre" : "Contenido"}
    </button>
  );

  const isEnvelope = current.id === "intro";
  const envelopeCover: CanvasCover | undefined = isEnvelope
    ? {
        closedLabel: "Sobre cerrado",
        openLabel: "Tarjeta (textos)",
        hint: "Así lo ven los invitados. Tocá el sello para ver la animación; al terminar pasás a editar los textos de la tarjeta.",
        render: ({ width, height, layout, onOpened }) => (
          <EnvelopeClosed assets={envelopeAssets} layout={layout} tokens={tokens} width={width} height={height} onOpened={onOpened} />
        ),
      }
    : undefined;

  const panel =
    current.id === "intro" ? (
      <EnvelopeImagesPanel initialAssets={envelopeAssets} initialCustom={envelope.custom} onAssetsChange={setEnvelopeAssets} textLayout={applyStyles(layouts.envelope, styles)} tokens={tokens} />
    ) : current.id === "styles" ? (
      <StylesPanel styles={styles} usage={styleUsage} tokens={tokens} onChange={handleStylesChange} onDelete={deleteStyle} />
    ) : (
      panels[current.id]
    );

  return (
    <div className="flex h-dvh flex-col bg-neutral-100 text-neutral-900">
      {/* Encabezado */}
      <header className="flex flex-wrap items-center gap-3 border-b border-neutral-200 bg-white px-4 py-2.5">
        <a href="/admin/dashboard" className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
          <ArrowLeft size={15} /> Panel
        </a>
        <h1 className="font-serif text-lg text-neutral-800">Editor de la invitación</h1>
        <SaveIndicator state={saveState} anyUnpublished={anyUnpublished} />
        <div className="ml-auto flex items-center gap-2">
          {notice && <span className="hidden text-xs text-neutral-500 md:inline">{notice}</span>}
          <a
            href="/admin/dashboard/preview"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100"
          >
            Ver invitación publicada <ExternalLink size={12} />
          </a>
          {anyUnpublished && (
            <button type="button" onClick={discard} className="rounded-md px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100">
              Descartar cambios
            </button>
          )}
          <button
            type="button"
            onClick={publish}
            disabled={!anyUnpublished || publishing}
            className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            {publishing && <Loader2 size={14} className="animate-spin" />} Publicar
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Secciones */}
        <nav className="w-56 shrink-0 overflow-y-auto border-r border-neutral-200 bg-white p-2" aria-label="Secciones">
          {(["sections", "general"] as const).map((group) => (
            <div key={group} className="mb-3">
              <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                {group === "sections" ? "Secciones" : "General"}
              </p>
              {sections
                .filter((s) => s.group === group)
                .map((s) => {
                  const active = s.id === currentId;
                  const isOn = s.zone ? enabled[s.id] : true;
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-1 rounded-md pr-1.5 ${active ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentId(s.id);
                          if (s.id === "intro") setContentOpen(true);
                        }}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-left text-sm ${!isOn && !active ? "text-neutral-400" : ""}`}
                      >
                        <span className="truncate">{s.label}</span>
                        {((s.design && unpublished(s.design)) || (s.id === "styles" && stylesUnpublished)) && (
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-amber-300" : "bg-amber-500"}`} title="Cambios sin publicar" />
                        )}
                      </button>
                      {s.zone && (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isOn}
                          aria-label={`Mostrar u ocultar ${s.label}`}
                          title={isOn ? "Visible para los invitados" : "Oculta"}
                          onClick={() => toggleZone(s)}
                          className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${isOn ? (active ? "bg-white/90" : "bg-neutral-900") : active ? "bg-white/30" : "bg-neutral-300"}`}
                        >
                          <span
                            className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full shadow transition-transform ${isOn ? "translate-x-3" : "translate-x-0"} ${active && isOn ? "bg-neutral-900" : "bg-white"}`}
                          />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}
          <p className="px-2 text-[11px] leading-snug text-neutral-400">
            El diseño se guarda solo como borrador. Los invitados lo ven al tocar Publicar. Los datos de «Contenido»
            (textos, fotos, lugares) se publican al guardarlos.
          </p>
        </nav>

        {/* Lienzo o contenido */}
        <main className="min-w-0 flex-1">
          {design ? (
            <ArtboardEditor
              key={`${design}-${version}`}
              section={design}
              initialLayout={layouts[design]}
              tokens={tokens}
              background={isEnvelope ? { color: ENVELOPE_BG } : current.background ?? { color: "var(--color-bg)" }}
              underlay={isEnvelope ? <EnvelopeCard /> : undefined}
              cover={envelopeCover}
              blocks={blocks[design]}
              onChange={onDesignChange}
              actions={contentToggle}
              styles={styles}
              onStylesChange={handleStylesChange}
              styleUsage={styleUsage}
            />
          ) : (
            <div className="h-full overflow-y-auto p-6">
              <div className="mx-auto max-w-2xl rounded-lg border border-neutral-200 bg-white p-5">
                <h2 className="mb-4 font-serif text-xl text-neutral-800">{current.label}</h2>
                {panel}
              </div>
            </div>
          )}
        </main>

        {/* Contenido de la sección */}
        {design && contentOpen && (
          <aside className="w-96 shrink-0 overflow-y-auto border-l border-neutral-200 bg-white p-4" aria-label={`Contenido de ${current.label}`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-lg text-neutral-800">{isEnvelope ? "Imágenes del sobre" : `Contenido · ${current.label}`}</h2>
              <button type="button" onClick={() => setContentOpen(false)} aria-label="Cerrar contenido" className="rounded p-1 text-neutral-500 hover:bg-neutral-100">
                <PanelRightClose size={16} />
              </button>
            </div>
            {panel}
          </aside>
        )}
      </div>
    </div>
  );
}

function SaveIndicator({ state, anyUnpublished }: { state: SaveState; anyUnpublished: boolean }) {
  if (state === "saving")
    return (
      <span className="flex items-center gap-1 text-xs text-neutral-500">
        <Loader2 size={12} className="animate-spin" /> Guardando…
      </span>
    );
  if (state === "error") return <span className="text-xs text-red-600">No se pudo guardar el borrador</span>;
  if (anyUnpublished)
    return (
      <span className="flex items-center gap-1 text-xs text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Borrador guardado · sin publicar
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs text-emerald-700">
      <Check size={12} /> Todo publicado
    </span>
  );
}
