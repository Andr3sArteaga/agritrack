import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Solo para titulos de la parte publica (font-titulo).
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgriTrack",
  description: "Plataforma de gestion agricola de AgroAn",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${instrument.variable} h-full antialiased`}
    >
      {/* Extensiones del navegador (ej. ColorZilla) agregan atributos al body antes de hidratar. */}
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-fondo font-sans text-tinta"
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
