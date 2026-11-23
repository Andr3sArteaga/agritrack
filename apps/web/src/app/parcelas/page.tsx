import { Advertencia } from "@/components/estado/advertencia";
import { LandingNavbar } from "@/components/publico/landing-navbar";
import { LandingPreventaSeccion } from "@/components/publico/landing-preventa-seccion";
import { PiePublico } from "@/components/publico/pie-publico";
import type { CatalogoParcela } from "@/lib/types";

/** null = no se pudo cargar (distinto de "no hay parcelas"). */
async function obtenerCatalogo(): Promise<CatalogoParcela[] | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  try {
    const res = await fetch(`${apiUrl}/public/parcelas`, {
      cache: "no-store",
    });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

export default async function CatalogoPage() {
  const parcelas = await obtenerCatalogo();

  return (
    <div className="flex min-h-screen flex-col bg-hueso text-tinta">
      <LandingNavbar sobreHero />

      {/* pt-20: deja libre el espacio de la barra superpuesta */}
      <main className="flex-1 bg-linear-to-b from-cielo via-hueso to-hueso to-40% pt-20">
        {parcelas === null ? (
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <Advertencia tipo="ATENCION" titulo="No pudimos cargar las parcelas" rol="alert">
              Intenta de nuevo en unos minutos.
            </Advertencia>
          </div>
        ) : (
          <LandingPreventaSeccion parcelasReales={parcelas} modoPaginaCompleta />
        )}
      </main>

      <PiePublico />
    </div>
  );
}
