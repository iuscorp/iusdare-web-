import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

// Serif editorial de alto contraste (titulares, con cursivas) + sans limpia tipo sistema iOS.
const display = Playfair_Display({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-display", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Agenda · Revoredo IusCorp", template: "%s · Revoredo IusCorp" },
  description: "El mundo jurídico en un solo lugar. Agenda una entrevista Vocare Iuris, un cafecito virtual o una asesoría profesional.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#102438", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
