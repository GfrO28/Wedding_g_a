"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronUp, ExternalLink, Loader2, MapPin, PanelRightClose, PanelRightOpen, Trash2 } from "lucide-react";
import { ENVELOPE_DESIGNS, envelopeColors, type EnvelopeDesign, type EnvelopeSlot, type VideoEnvelopeAssets } from "@/lib/envelopeAssets";
import { VideoEnvelopeImagesPanel, videoEnvelopeImages } from "./VideoEnvelopeImagesPanel";
import { FramedEnvelope } from "@/app/components/FramedEnvelope";
import { applyStyles, backdropOf, ENVELOPE_VIDEO_BG, isCustom, LAYOUT_SECTIONS, mapSourceOf, withDynamic, type LayoutSection, type TextElement, type TextLayout, type TextStyle, type TokenValues } from "@/lib/textLayout";
import { ArtboardEditor, type CanvasCover, type Clip, type EditorApi } from "./ArtboardEditor";
import { GalleryPhotosPanel, type LibraryPhoto } from "./GalleryPhotosPanel";
import { DesktopBackgroundPanel } from "./DesktopBackgroundPanel";
import type { DesktopBackground } from "@/lib/desktopBackground";
import { EnvelopeCard, EnvelopeClosed } from "./EnvelopeCanvas";
import { EnvelopeImagesPanel } from "./EnvelopeImagesPanel";
import { discardDraftsAction, publishAction, saveDraftAction, saveStylesDraftAction } from "./layout-actions";
import { Hint } from "./Hint";
import { saveSectionOrderAction, setEnvelopeDesignAction, toggleZoneEnabledAction } from "./zone-actions";

export type EditorSection = {
  id: string;
  label: string;
  group: "sections" | "general";
  zone?: string; // clave del interruptor visible/oculta
  enabled?: boolean;
  design?: LayoutSection; // tiene lienzo
  background?: { color: string };
  custom?: boolean; // sección personalizada (en blanco)
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
  galleryPhotos: initialGalleryPhotos,
  desktopBackground,
}: {
  sections: EditorSection[];
  panels: Record<string, ReactNode>;
  blocks: Record<string, Record<string, ReactNode>>;
  published: Record<LayoutSection, TextLayout>;
  drafts: Record<LayoutSection, TextLayout>;
  styles: { published: TextStyle[]; draft: TextStyle[] };
  tokens: TokenValues;
  envelope: { assets: Record<EnvelopeSlot, string>; custom: Record<EnvelopeSlot, boolean>; design: EnvelopeDesign; video: VideoEnvelopeAssets; paper: string };
  galleryPhotos: LibraryPhoto[];
  desktopBackground: DesktopBackground;
}) {
  // Orden de las secciones del cuerpo (el sobre va primero y el pie al final, fijos).
  const [order, setOrder] = useState(() => sections.filter((s) => s.group === "sections" && s.id !== "intro" && s.id !== "footer").map((s) => s.id));
  const [currentId, setCurrentId] = useState((sections.find((s) => !s.zone || s.enabled !== false) ?? sections[0]).id);
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
  // Versión del sobre: cada una tiene su propio lienzo.
  const [envDesign, setEnvDesign] = useState<EnvelopeDesign>(envelope.design);
  const [videoAssets, setVideoAssets] = useState(envelope.video);
  // Papel del sobre clásico: colores del interior y del texto «Toca el sello».
  const [paper, setPaper] = useState(envelope.paper);
  const paperColors = useMemo(() => envelopeColors(paper), [paper]);
  const monogram = `${tokens.inicial1 ?? ""}${tokens.inicial2 ?? ""}`;
  const designOf = (s: EditorSection): LayoutSection | undefined => (s.id === "intro" && envDesign === "video" ? "envelopeVideo" : s.design);
  const [galleryPhotos, setGalleryPhotos] = useState(initialGalleryPhotos);
  // Mapa recién agregado: se abre «Contenido» con su campo listo para escribir.
  const [focusMap, setFocusMap] = useState<string | null>(null);
  // Lo cortado o copiado en el lienzo (se pega en cualquier sección).
  const [clipboard, setClipboard] = useState<Clip | null>(null);
  const editorApi = useRef<EditorApi>(null);
  // Fotos que ya están subidas (galería e imágenes usadas en otras secciones):
  // se pueden reutilizar en "+ Agregar" sin volver a subirlas.
  const imageLibrary = useMemo(() => {
    const seen = new Set<string>();
    const out: { src: string; alt: string }[] = [];
    const add = (src: string, alt: string) => {
      if (!src || seen.has(src)) return;
      seen.add(src);
      out.push({ src, alt });
    };
    for (const p of galleryPhotos) add(p.url, p.alt ?? "");
    for (const s of Object.values(layouts))
      for (const e of [...s.portrait, ...s.landscape]) if (e.kind === "photo" && e.id.startsWith("x-")) add(e.src, e.text);
    return out;
  }, [galleryPhotos, layouts]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  // Al agregar o borrar un paso del itinerario en "Contenido", el servidor
  // manda el diseño con los pasos al día: se suman o quitan en el lienzo sin
  // perder lo que ya se acomodó.
  const [seenDrafts, setSeenDrafts] = useState(drafts);
  if (drafts !== seenDrafts) {
    setSeenDrafts(drafts);
    const merged = mergeSteps(layouts.itinerary, drafts.itinerary);
    const story = mergeChapters(layouts.story, drafts.story);
    if (merged || story) {
      setLayouts({ ...layouts, ...(merged ? { itinerary: merged } : null), ...(story ? { story } : null) });
      setPublishedState({
        ...publishedState,
        itinerary: mergeSteps(publishedState.itinerary, published.itinerary) ?? publishedState.itinerary,
        story: mergeChapters(publishedState.story, published.story) ?? publishedState.story,
      });
      setVersion((v) => v + 1);
    }
  }
  const pending = useRef(new Map<LayoutSection, TextLayout>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = sections.find((s) => s.id === currentId)!;
  const unpublished = (s: LayoutSection) => JSON.stringify(layouts[s]) !== JSON.stringify(publishedState[s]);
  const stylesUnpublished = JSON.stringify(styles) !== JSON.stringify(publishedStyles);
  const anyUnpublished = stylesUnpublished || sections.some((s) => s.design && unpublished(s.design)) || unpublished("envelopeVideo");

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

  const design = designOf(current);
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

  // Eliminar una sección la saca de la invitación (sus datos y su diseño
  // quedan guardados, así se puede volver a agregar tal cual).
  async function removeSection(s: EditorSection) {
    if (!s.zone || !window.confirm(`¿Eliminar la sección «${s.label}» de la invitación? Podés volver a agregarla desde «+ Agregar sección».`)) return;
    setEnabled((e) => ({ ...e, [s.id]: false }));
    if (currentId === s.id) setCurrentId(sections.find((x) => x.group === "sections" && x.id !== s.id && (!x.zone || enabled[x.id]))?.id ?? "music");
    await toggleZoneEnabledAction(s.zone, false);
  }
  async function addSection(s: EditorSection) {
    if (!s.zone) return;
    setEnabled((e) => ({ ...e, [s.id]: true }));
    setCurrentId(s.id);
    await toggleZoneEnabledAction(s.zone, true);
  }

  // Sube o baja una sección (salteando las que no están en la invitación). Se publica al toque.
  async function moveSection(id: string, dir: -1 | 1) {
    const visible = order.filter((x) => enabled[x]);
    const i = visible.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= visible.length) return;
    const next = [...order];
    const a = next.indexOf(id), b = next.indexOf(visible[j]);
    [next[a], next[b]] = [next[b], next[a]];
    setOrder(next);
    await saveSectionOrderAction(next);
  }
  const navSections = [...sections].sort((a, b) => {
    const r = (s: EditorSection) => (s.id === "intro" ? -1 : s.id === "footer" ? 1e3 : order.indexOf(s.id));
    return a.group === "sections" && b.group === "sections" ? r(a) - r(b) : 0;
  });

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
      {contentOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />} {current.id === "intro" ? "Sobre" : "Contenido"}
    </button>
  );

  const isEnvelope = current.id === "intro";
  const classicEnvelope = isEnvelope && envDesign === "classic";
  const envelopeCover: CanvasCover | undefined = classicEnvelope
    ? {
        closedLabel: "Sobre cerrado",
        openLabel: "Tarjeta (textos)",
        hint: "Así lo ven los invitados. Tocá el sello para ver la animación; al terminar pasás a editar los textos de la tarjeta.",
        render: ({ width, height, layout, onOpened }) => (
          <EnvelopeClosed assets={envelopeAssets} layout={layout} tokens={tokens} width={width} height={height} onOpened={onOpened} colors={paperColors} />
        ),
      }
    : undefined;

  // Plantilla de la sección: volver al diseño original (se puede deshacer).
  const templateCard = design ? (
    <section className="mb-5 flex flex-col gap-2 rounded-lg border border-neutral-200 p-3" aria-label="Plantilla">
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Plantilla</h3>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-10 shrink-0 flex-col items-center justify-center gap-1 rounded border border-neutral-200 bg-neutral-50">
          <span className="h-1 w-6 rounded bg-neutral-300" />
          <span className="h-1.5 w-4 rounded bg-neutral-400" />
          <span className="h-1 w-5 rounded bg-neutral-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-800">Diseño original</p>
          <p className="text-xs text-neutral-500">Vuelve a ubicar los objetos como venían. Se puede deshacer.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`¿Aplicar el diseño original a «${current.label}»? Lo que acomodaste se reemplaza (podés deshacerlo con Ctrl+Z).`)) editorApi.current?.restoreOriginal();
          }}
          className="shrink-0 rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:bg-neutral-50"
        >
          Aplicar
        </button>
      </div>
    </section>
  ) : null;

  // Mapas agregados en esta sección: su dirección o link se carga acá.
  const mapObjects = design ? layouts[design].portrait.filter((e) => e.kind === "map" && isCustom(e) && !e.ref) : [];

  const designPicker = isEnvelope && (
    <section className="mb-5 flex flex-col gap-2" aria-label="Versión del sobre">
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Versión del sobre</h3>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(ENVELOPE_DESIGNS) as EnvelopeDesign[]).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={envDesign === d}
            onClick={async () => {
              setEnvDesign(d);
              await setEnvelopeDesignAction(d);
            }}
            className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 text-xs ${envDesign === d ? "border-blue-500 bg-blue-50 text-blue-900" : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"}`}
          >
            {d === "classic" ? (
              // El sobre cerrado completo: las cuatro solapas del color del papel y el sello.
              <span className="relative block h-16 w-10 overflow-hidden rounded-sm shadow-sm">
                <svg viewBox="0 0 40 64" className="absolute inset-0 h-full w-full" aria-hidden>
                  <polygon points="0,0 40,0 20,32" fill={paper} style={{ filter: "brightness(.9)" }} />
                  <polygon points="0,64 40,64 20,32" fill={paper} style={{ filter: "brightness(.84)" }} />
                  <polygon points="0,0 20,32 0,64" fill={paper} />
                  <polygon points="40,0 20,32 40,64" fill={paper} style={{ filter: "brightness(.95)" }} />
                  <path d="M0,0 L20,32 L0,64 M40,0 L20,32 L40,64" fill="none" stroke="rgba(0,0,0,.25)" strokeWidth=".6" />
                </svg>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={envelopeAssets.seal} alt="" className="absolute left-1/2 top-1/2 w-3.5 -translate-x-1/2 -translate-y-1/2" />
              </span>
            ) : (
              <span className="relative flex h-16 w-10 items-center justify-center overflow-hidden rounded-sm bg-gradient-to-b from-neutral-500 to-neutral-800">
                <span className="block w-8"><FramedEnvelope color="#d8c2a3" seal={envelopeAssets.seal} monogram="" /></span>
              </span>
            )}
            {ENVELOPE_DESIGNS[d]}
          </button>
        ))}
      </div>
      <p className="text-[11px] leading-snug text-neutral-500">
        {envDesign === "video"
          ? "Poné el video con «+ Agregar → Imagen → Usar de fondo». Los textos, el sobre y la cuenta regresiva se acomodan en el lienzo; el sobre se abre al tocarlo. Cambiar de versión se publica al instante."
          : "Las solapas se abren a pantalla completa y muestran la tarjeta con los textos. Cambiar de versión se publica al instante."}
      </p>
    </section>
  );

  const panel =
    current.id === "intro" && envDesign === "video" ? (
      <VideoEnvelopeImagesPanel
        assets={videoAssets}
        onChange={setVideoAssets}
        color={layouts.envelopeVideo.portrait.find((e) => e.id === "envelope")?.color ?? "#d8c2a3"}
        classicSeal={envelopeAssets.seal}
        monogram={monogram}
      />
    ) : current.id === "intro" ? (
      <EnvelopeImagesPanel initialAssets={envelopeAssets} initialCustom={envelope.custom} onAssetsChange={setEnvelopeAssets} textLayout={applyStyles(layouts.envelope, styles)} tokens={tokens} paper={paper} onPaperChange={setPaper} />
    ) : current.id === "gallery" ? (
      <GalleryPhotosPanel
        photos={galleryPhotos}
        placed={new Set(layouts.gallery.portrait.filter((e) => e.id.startsWith("photo-")).map((e) => e.ref || e.id.slice(6)))}
        onPhotosChange={(list) => {
          if (list.length > galleryPhotos.length) editorApi.current?.manual();
          setGalleryPhotos(list);
        }}
        onPlace={(item) => editorApi.current?.place(item)}
        onUnplace={(key) => editorApi.current?.unplace(key)}
      />
    ) : current.id === "desktop" ? (
      <DesktopBackgroundPanel initial={desktopBackground} sampleImage={backdropOf(layouts.hero)} />
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
              {navSections
                .filter((s) => s.group === group && (group === "general" || !s.zone || enabled[s.id]))
                .map((s, i, list) => {
                  const movable = order.includes(s.id);
                  const canUp = movable && i > 0 && order.includes(list[i - 1].id);
                  const canDown = movable && i < list.length - 1 && order.includes(list[i + 1].id);
                  const active = s.id === currentId;
                  const isOn = s.zone ? enabled[s.id] : true;
                  return (
                    <div
                      key={s.id}
                      className={`group/row flex items-center gap-1 rounded-md pr-1.5 ${active ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentId(s.id);
                          // El sobre y la galería abren con sus imágenes a la vista.
                          if (s.id === "intro" || s.id === "gallery") setContentOpen(true);
                        }}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-left text-sm ${!isOn && !active ? "text-neutral-400" : ""}`}
                      >
                        <span className="truncate">{s.label}</span>
                        {((designOf(s) && unpublished(designOf(s)!))) && (
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-amber-300" : "bg-amber-500"}`} title="Cambios sin publicar" />
                        )}
                      </button>
                      {movable && (
                        <span className={`flex flex-col group-hover/row:opacity-100 group-focus-within/row:opacity-100 ${active ? "opacity-100" : "opacity-0"}`} data-move={s.id}>
                          <button type="button" disabled={!canUp} onClick={() => moveSection(s.id, -1)} aria-label={`Subir la sección ${s.label}`} title="Subir" className={`rounded leading-none disabled:invisible ${active ? "text-white/70 hover:text-white" : "text-neutral-400 hover:text-neutral-900"}`}>
                            <ChevronUp size={12} />
                          </button>
                          <button type="button" disabled={!canDown} onClick={() => moveSection(s.id, 1)} aria-label={`Bajar la sección ${s.label}`} title="Bajar" className={`rounded leading-none disabled:invisible ${active ? "text-white/70 hover:text-white" : "text-neutral-400 hover:text-neutral-900"}`}>
                            <ChevronDown size={12} />
                          </button>
                        </span>
                      )}
                      {s.zone && group === "sections" && (
                        <button
                          type="button"
                          aria-label={`Eliminar la sección ${s.label}`}
                          title="Eliminar la sección (se puede volver a agregar)"
                          onClick={() => removeSection(s)}
                          className={`rounded p-1 ${active ? "text-white/70 hover:text-white" : "text-neutral-300 hover:text-red-600"}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                      {s.zone && group === "general" && (
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
              {group === "sections" && <AddSectionMenu sections={sections.filter((s) => s.group === "sections" && s.zone && !enabled[s.id])} onAdd={addSection} />}
            </div>
          ))}
          <Hint id="drafts" className="px-2"><p className="text-[11px] leading-snug text-neutral-400">
            El diseño se guarda solo como borrador. Los invitados lo ven al tocar Publicar. Los datos de «Contenido»
            (textos, fotos, lugares) se publican al guardarlos.
          </p></Hint>
        </nav>

        {/* Lienzo o contenido */}
        <main className="min-w-0 flex-1">
          {design ? (
            <ArtboardEditor
              key={`${design}-${version}`}
              section={design}
              initialLayout={layouts[design]}
              tokens={tokens}
              background={{ color: classicEnvelope ? paperColors.background : isEnvelope ? ENVELOPE_VIDEO_BG : current.background?.color ?? "var(--color-bg)" }}
              onAdded={(el) => {
                if (el.kind !== "map") return;
                setContentOpen(true);
                setFocusMap(el.id);
              }}
              clipboard={clipboard}
              onClipboard={setClipboard}
              onOpenContent={(id) => {
                setContentOpen(true);
                setFocusMap(id ?? null);
              }}
              underlay={classicEnvelope ? <EnvelopeCard /> : undefined}
              cover={envelopeCover}
              blocks={
                design === "envelopeVideo"
                  ? { envelope: (el) => <FramedEnvelope color={el.color} seal={envelopeAssets.seal} monogram={monogram} images={videoEnvelopeImages(videoAssets)} /> }
                  : blocks[design]
              }
              onChange={onDesignChange}
              actions={contentToggle}
              styles={styles}
              onStylesChange={handleStylesChange}
              styleUsage={styleUsage}
              apiRef={editorApi}
              imageLibrary={imageLibrary}
              onOpenLibrary={() => setContentOpen(true)}
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
              <h2 className="font-serif text-lg text-neutral-800">{isEnvelope ? "Sobre de apertura" : `Contenido · ${current.label}`}</h2>
              <button type="button" onClick={() => setContentOpen(false)} aria-label="Cerrar contenido" className="rounded p-1 text-neutral-500 hover:bg-neutral-100">
                <PanelRightClose size={16} />
              </button>
            </div>
            {designPicker}
            {templateCard}
            {mapObjects.length > 0 && (
              <MapObjectsPanel
                maps={mapObjects}
                focus={focusMap}
                onFocused={() => setFocusMap(null)}
                onChange={(id, text) => editorApi.current?.patch(id, { text })}
              />
            )}
            {panel}
          </aside>
        )}
      </div>
    </div>
  );
}

const stepKeys = (l: TextLayout) =>
  l.portrait.filter((e) => /^step-.+-icon$/.test(e.id)).map((e) => e.ref).sort().join(",");

// Suma los pasos nuevos (acomodados con la versión que está en pantalla) y
// quita los borrados, conservando la posición del resto.
function mergeSteps(current: TextLayout, incoming: TextLayout): TextLayout | null {
  if (stepKeys(current) === stepKeys(incoming)) {
    // Mismos pasos: solo se sincronizan los íconos editados en "Contenido".
    const icon = (l: TextLayout, id: string) => l.portrait.find((e) => e.id === id)?.variant;
    const changed = incoming.portrait.filter((e) => /^step-.+-icon$/.test(e.id) && icon(current, e.id) !== e.variant);
    if (!changed.length) return null;
    const out: TextLayout = { ...current };
    for (const o of ["portrait", "landscape"] as const)
      out[o] = current[o].map((e) => {
        const c = changed.find((x) => x.id === e.id);
        return c ? { ...e, variant: c.variant } : e;
      });
    return out;
  }
  // Cada paso con el ícono que trae el servidor (sale de los datos del paso).
  const steps = incoming.portrait.filter((e) => /^step-.+-icon$/.test(e.id)).map((e) => ({ key: e.ref, icon: e.variant }));
  const merged = withDynamic("itinerary", current, { steps });
  // Los íconos de los pasos nuevos vienen del servidor (el que se eligió al cargarlo).
  for (const o of ["portrait", "landscape"] as const)
    merged[o] = merged[o].map((e) => {
      const fresh = /^step-.+-icon$/.test(e.id) && !current[o].some((x) => x.id === e.id) ? incoming[o].find((x) => x.id === e.id) : undefined;
      return fresh ? { ...e, variant: fresh.variant } : e;
    });
  return merged;
}

// Capítulos: se suman o quitan los capítulos y se actualizan las fotos que
// cambiaron en "Contenido", sin tocar cómo quedaron acomodados.
const chapterItems = (l: TextLayout) =>
  l.portrait
    .filter((e) => /^chap-.+-title$/.test(e.id))
    .map((t) => {
      const photo = l.portrait.find((e) => e.id === `chap-${t.ref}-photo`);
      return { key: t.ref, image: photo && !photo.removed ? photo.src : "", alt: "" };
    });
function mergeChapters(current: TextLayout, incoming: TextLayout): TextLayout | null {
  const sig = (l: TextLayout) => JSON.stringify(chapterItems(l));
  if (sig(current) === sig(incoming)) return null;
  return withDynamic("story", current, { chapters: chapterItems(incoming) });
}

// Secciones disponibles para agregar (las que no están en la invitación).
const SECTION_HELP: Record<string, string> = {
  intro: "El sobre con sello que se abre al entrar",
  hero: "Nombres, fecha y saludo al invitado",
  countdown: "Los días, horas y minutos que faltan",
  blessing: "Una frase, el monograma y los padres",
  story: "Capítulos con foto de su historia",
  event: "Ceremonia y recepción: hora, lugar, mapas y botones de Google Maps y Waze",
  itinerary: "Los momentos del día, con íconos",
  gallery: "Fotos con marco y ampliación",
  accommodation: "Hoteles recomendados",
  gifts: "Lista de regalos, luna de miel y datos de pago",
  rsvp: "El formulario para confirmar asistencia",
  messages: "Los mensajes de los invitados",
  footer: "Cierre con los nombres y el hashtag",
  dresscode: "La vestimenta y una paleta de colores sugerida",
};
function AddSectionMenu({ sections, onAdd }: { sections: EditorSection[]; onAdd: (s: EditorSection) => void }) {
  const predefined = sections.filter((s) => !s.custom);
  // Las personalizadas se agregan de a una (la próxima libre).
  const nextCustom = sections.find((s) => s.custom);
  return (
    <div className="mt-1">
      <select
        aria-label="Agregar sección"
        value=""
        disabled={!sections.length}
        title={sections.length ? "Agregar una sección a la invitación" : "Ya están todas las secciones"}
        onChange={(e) => {
          const s = sections.find((x) => x.id === e.target.value);
          if (s) onAdd(s);
        }}
        className="w-full cursor-pointer rounded-md border border-dashed border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
      >
        <option value="">+ Agregar sección…</option>
        {predefined.length > 0 && (
          <optgroup label="Predefinidas">
            {predefined.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}{SECTION_HELP[s.id] ? ` — ${SECTION_HELP[s.id]}` : ""}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label="Personalizada">
          <option value={nextCustom?.id ?? "__none"} disabled={!nextCustom}>
            {nextCustom ? "Sección personalizada (en blanco)" : "Sección personalizada (ya usaste las 3)"}
          </option>
        </optgroup>
      </select>
    </div>
  );
}

// Dirección o link de cada mapa agregado en la sección.
function MapObjectsPanel({
  maps,
  focus,
  onFocused,
  onChange,
}: {
  maps: TextElement[];
  focus: string | null;
  onFocused: () => void;
  onChange: (id: string, text: string) => void;
}) {
  return (
    <section className="mb-5 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50/40 p-3" aria-label="Mapas agregados">
      <h3 className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        <MapPin size={13} /> Mapas agregados
      </h3>
      {maps.map((m, i) => (
        <MapField key={`${m.id}:${m.text}`} el={m} index={maps.length > 1 ? i + 1 : 0} focus={focus === m.id} onFocused={onFocused} onSave={(t) => onChange(m.id, t)} />
      ))}
    </section>
  );
}

function MapField({ el, index, focus, onFocused, onSave }: { el: TextElement; index: number; focus: boolean; onFocused: () => void; onSave: (text: string) => void }) {
  const [value, setValue] = useState(el.text);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!focus) return;
    ref.current?.focus();
    ref.current?.scrollIntoView({ block: "nearest" });
    onFocused();
  }, [focus, onFocused]);
  const src = mapSourceOf(value);
  const dirty = value.trim() !== el.text.trim();
  return (
    <form
      className="flex flex-col gap-1.5"
      data-map-field={el.id}
      onSubmit={(e) => {
        e.preventDefault();
        onSave(value.trim());
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-600">{index ? `Mapa ${index}: ` : ""}dirección o link de Google Maps</span>
        <textarea
          ref={ref}
          rows={2}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSave(value.trim());
            }
          }}
          placeholder="Av. Siempre Viva 742, Lima · o pegá el link de Google Maps"
          className="w-full resize-y rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
        />
      </label>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={!dirty} className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-40">
          Aplicar
        </button>
        <span className="text-[11px] leading-snug text-neutral-500">
          {!value.trim()
            ? "Tip: en Google Maps → Compartir → «Insertar un mapa», copiá el código y pegalo acá."
            : src.embed
              ? "✓ Se ve el mapa."
              : src.open
                ? "Este link no se puede mostrar adentro (se verá un botón «Ver el mapa»). Para ver el mapa, pegá la dirección o el código de «Insertar un mapa»."
                : "No se reconoce el link."}
        </span>
      </div>
    </form>
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
