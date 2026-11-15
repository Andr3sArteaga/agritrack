import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgriTrack",
  description: "Plataforma de gestion agricola de AgroAn",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      {/* Extensiones del navegador (ej. ColorZilla) agregan atributos al body antes de hidratar. */}
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-stone-50 text-stone-900"
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
