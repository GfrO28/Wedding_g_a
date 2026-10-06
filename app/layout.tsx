import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { WEDDING } from "@/lib/content";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
