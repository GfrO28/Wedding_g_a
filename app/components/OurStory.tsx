import Image from "next/image";
import { getWeddingContent, type StoryChapter } from "@/lib/weddingContent";
import { FadeIn } from "./FadeIn";
import { FlowText } from "./FlowText";
import { getTextLayout, getTokenValues } from "@/lib/textLayoutServer";
import { Slide } from "./Slide";

const OBJECT_POSITION: Record<StoryChapter["imageFocus"], string> = {
  top: "object-top",
  center: "object-center",
  bottom: "object-bottom",
};

export async function OurStory() {
  const [WEDDING, layout, tokens] = await Promise.all([getWeddingContent(), getTextLayout("story"), getTokenValues("")]);
  if (WEDDING.story.length < 1) return null;

  return (
    <Slide>
    <section className="mx-auto max-w-3xl px-6">
      <FadeIn>
        <FlowText as="h2" className="mb-12" layout={layout} id="title" tokens={tokens} />
      </FadeIn>
      <div className="space-y-16">
        {WEDDING.story.map((chapter, i) => (
          <FadeIn key={chapter.id} delay={i * 0.1}>
            <Chapter chapter={chapter} />
          </FadeIn>
        ))}
      </div>
    </section>
    </Slide>
  );
}

function Chapter({ chapter }: { chapter: StoryChapter }) {
  const text = (
    <div>
      <p className="text-sm uppercase tracking-wide text-[var(--color-muted)]">
        {chapter.year}
      </p>
      <h3 className="font-serif text-2xl text-[var(--color-fg)]">{chapter.title}</h3>
      <p className="mt-2 text-[var(--color-muted)]">{chapter.text}</p>
    </div>
  );

  const hasImage = chapter.image.trim().length > 0;

  if (chapter.layout === "text-only" || !hasImage) {
    return <div className="mx-auto max-w-lg text-center">{text}</div>;
  }

  const image = (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--color-border)]">
      <Image
        src={chapter.image}
        alt={chapter.title}
        fill
        className={`object-cover ${OBJECT_POSITION[chapter.imageFocus]}`}
      />
    </div>
  );

  if (chapter.layout === "image-top") {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        {image}
        {text}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
      {chapter.layout === "image-right" ? (
        <>
          <div className="sm:order-2">{image}</div>
          <div className="sm:order-1">{text}</div>
        </>
      ) : (
        <>
          {image}
          {text}
        </>
      )}
    </div>
  );
}
