"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Check, ExternalLink, Loader2, PanelRightClose, PanelRightOpen, Plus, Trash2 } from "lucide-react";
import type { EnvelopeSlot } from "@/lib/envelopeAssets";
import { applyStyles, LAYOUT_SECTIONS, pickStyle, withDynamic, type LayoutSection, type TextLayout, type TextStyle, type TokenValues } from "@/lib/textLayout";
import { ArtboardEditor, type CanvasCover, type EditorApi } from "./ArtboardEditor";
import { GalleryPhotosPanel, type LibraryPhoto } from "./GalleryPhotosPanel";
import { DesktopBackgroundPanel } from "./DesktopBackgroundPanel";
import type { DesktopBackground } from "@/lib/desktopBackground";
import { ENVELOPE_BG, EnvelopeCard, EnvelopeClosed } from "./EnvelopeCanvas";
import { EnvelopeImagesPanel } from "./EnvelopeImagesPanel";
import { discardDraftsAction, publishAction, saveDraftAction, saveStylesDraftAction } from "./layout-actions";
import { StylesPanel } from "./StylesPanel";
import { Hint } from "./Hint";
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
  envelope: { assets: Record<EnvelopeSlot, string>; custom: Record<EnvelopeSlot, boolean> };
  galleryPhotos: LibraryPhoto[];
  desktopBackground: DesktopBackground;
}) {
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
  const [galleryPhotos, setGalleryPhotos] = useState(initialGalleryPhotos);
  // Fondo de cada sección (imagen o video); se cambia desde la capa Fondo.
  const [bgs, setBgs] = useState<Record<string, string | null>>(() => Object.fromEntries(sections.map((s) => [s.id, s.background?.image ?? null])));
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

  const panel =
    current.id === "intro" ? (
      <EnvelopeImagesPanel initialAssets={envelopeAssets} initialCustom={envelope.custom} onAssetsChange={setEnvelopeAssets} textLayout={applyStyles(layouts.envelope, styles)} tokens={tokens} />
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
      <DesktopBackgroundPanel initial={desktopBackground} sampleImage={sections.find((x) => x.id === "hero")?.background?.image ?? null} />
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
                .filter((s) => s.group === group && (group === "general" || !s.zone || enabled[s.id]))
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
                          // El sobre y la galería abren con sus imágenes a la vista.
                          if (s.id === "intro" || s.id === "gallery") setContentOpen(true);
                        }}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-left text-sm ${!isOn && !active ? "text-neutral-400" : ""}`}
                      >
                        <span className="truncate">{s.label}</span>
                        {((s.design && unpublished(s.design)) || (s.id === "styles" && stylesUnpublished)) && (
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-amber-300" : "bg-amber-500"}`} title="Cambios sin publicar" />
                        )}
                      </button>
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
              background={
                isEnvelope
                  ? { color: ENVELOPE_BG }
                  : { color: current.background?.color ?? "var(--color-bg)", image: bgs[current.id] ?? null, overlay: Boolean(bgs[current.id]) }
              }
              bgZone={BG_ZONES.includes(current.id) ? current.id : undefined}
              onBackgroundChange={(url) => setBgs((b) => ({ ...b, [current.id]: url }))}
              underlay={isEnvelope ? <EnvelopeCard /> : undefined}
              cover={envelopeCover}
              blocks={blocks[design]}
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
              <h2 className="font-serif text-lg text-neutral-800">{isEnvelope ? "Imágenes del sobre" : `Contenido · ${current.label}`}</h2>
              <button type="button" onClick={() => setContentOpen(false)} aria-label="Cerrar contenido" className="rounded p-1 text-neutral-500 hover:bg-neutral-100">
                <PanelRightClose size={16} />
              </button>
            </div>
            {templateCard}
            {panel}
          </aside>
        )}
      </div>
    </div>
  );
}

// Secciones con fondo propio (imagen o video).
const BG_ZONES = ["hero", "countdown", "blessing", "story", "event", "itinerary", "location", "gallery", "accommodation", "gifts", "rsvp", "messages"];

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
  event: "Ceremonia y recepción: hora y lugar",
  itinerary: "Los momentos del día, con íconos",
  location: "Mapas y botones de Google Maps y Waze",
  gallery: "Fotos con marco y ampliación",
  accommodation: "Hoteles recomendados",
  gifts: "Lista de regalos, luna de miel y datos de pago",
  rsvp: "El formulario para confirmar asistencia",
  messages: "Los mensajes de los invitados",
  footer: "Cierre con los nombres y el hashtag",
};
function AddSectionMenu({ sections, onAdd }: { sections: EditorSection[]; onAdd: (s: EditorSection) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        disabled={!sections.length}
        className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-2 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
        title={sections.length ? "Agregar una sección" : "Ya están todas las secciones"}
      >
        <Plus size={14} /> Agregar sección
      </button>
      {open && (
        <ul className="mt-1 flex flex-col gap-0.5 rounded-md border border-neutral-200 bg-white p-1 shadow-sm" aria-label="Secciones para agregar">
          {sections.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onAdd(s);
                }}
                className="w-full rounded px-2 py-1.5 text-left hover:bg-neutral-50"
              >
                <span className="block text-sm text-neutral-800">{s.label}</span>
                <span className="block text-[11px] leading-snug text-neutral-500">{SECTION_HELP[s.id] ?? ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
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
