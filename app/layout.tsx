import type { Metadata } from "next";
import { Playfair_Display, Inter, Alex_Brush, Cormorant_Garamond } from "next/font/google";
import { getWeddingContent } from "@/lib/weddingContent";
import { getTheme, themeToCssVars } from "@/lib/theme";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const alexBrush = Alex_Brush({
  variable: "--font-script",
  weight: "400",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-envelope",
  weight: ["300", "400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

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
    <html
      lang="es"
      className={`${playfair.variable} ${inter.variable} ${alexBrush.variable} ${cormorant.variable} h-full antialiased`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeToCssVars(theme) }} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[var(--color-bg)] text-[var(--color-fg)]">
        {children}
      </body>
    </html>
  );
}
