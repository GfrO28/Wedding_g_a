import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { WEDDING } from "@/lib/content";
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

export const metadata: Metadata = {
  title: `${WEDDING.partner1} & ${WEDDING.partner2}`,
  description: `Invitación de la boda de ${WEDDING.partner1} y ${WEDDING.partner2}`,
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await getTheme();

  return (
    <html
      lang="es"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
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
