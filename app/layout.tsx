import type { Metadata } from "next";
import {
  Playfair_Display,
  Inter,
  Alex_Brush,
  Cormorant_Garamond,
  EB_Garamond,
  Lora,
  Cinzel,
  Italiana,
  Great_Vibes,
  Parisienne,
  Pinyon_Script,
  Montserrat,
} from "next/font/google";
import { getWeddingContent } from "@/lib/weddingContent";
import { getTheme, themeToCssVars } from "@/lib/theme";
import "./globals.css";

const playfair = Playfair_Display({ variable: "--font-serif", subsets: ["latin"] });
const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });
const alexBrush = Alex_Brush({ variable: "--font-script", weight: "400", subsets: ["latin"] });
const cormorant = Cormorant_Garamond({
  variable: "--font-envelope",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

// Tipografías extra del editor de textos: sin precarga, el navegador solo
// las descarga si algún texto las usa.
const ebGaramond = EB_Garamond({ variable: "--font-ebgaramond", subsets: ["latin"], style: ["normal", "italic"], preload: false });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], style: ["normal", "italic"], preload: false });
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], preload: false });
const italiana = Italiana({ variable: "--font-italiana", weight: "400", subsets: ["latin"], preload: false });
const greatVibes = Great_Vibes({ variable: "--font-greatvibes", weight: "400", subsets: ["latin"], preload: false });
const parisienne = Parisienne({ variable: "--font-parisienne", weight: "400", subsets: ["latin"], preload: false });
const pinyon = Pinyon_Script({ variable: "--font-pinyon", weight: "400", subsets: ["latin"], preload: false });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], style: ["normal", "italic"], preload: false });

const fontVars = [playfair, inter, alexBrush, cormorant, ebGaramond, lora, cinzel, italiana, greatVibes, parisienne, pinyon, montserrat]
  .map((f) => f.variable)
  .join(" ");

export async function generateMetadata(): Promise<Metadata> {
  const { partner1, partner2 } = await getWeddingContent();
  return {
    title: `${partner1} & ${partner2}`,
    description: `Invitación de la boda de ${partner1} y ${partner2}`,
    robots: { index: false, follow: false },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await getTheme();

  return (
    <html lang="es" className={`${fontVars} h-full antialiased`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeToCssVars(theme) }} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[var(--color-bg)] text-[var(--color-fg)]">
        {children}
      </body>
    </html>
  );
}
