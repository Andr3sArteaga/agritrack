import Link from "next/link";
import { Mail, MapPin, Phone, Sprout } from "lucide-react";
import { Advertencia } from "@/components/estado/advertencia";
import { LandingNavbar } from "@/components/publico/landing-navbar";
import { LandingPreventaSeccion } from "@/components/publico/landing-preventa-seccion";
import type { CatalogoParcela } from "@/lib/types";

const TELEFONO_CONTACTO =
  process.env.NEXT_PUBLIC_CONTACTO_TELEFONO ?? "+591 70000000";
const EMAIL_CONTACTO =
  process.env.NEXT_PUBLIC_CONTACTO_EMAIL ?? "contacto@agroan.com";

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
    <div className="flex min-h-screen flex-col bg-[#f8faf9] text-[#17211D]">
      <LandingNavbar />

      <main className="flex-1">
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

      <footer className="border-t border-[#E4EAE6] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="grid gap-8 md:grid-cols-3 md:items-start">
            <div>
              <Link href="/#inicio" className="inline-flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#004b36] text-[#00a859]">
                  <Sprout className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-lg font-bold text-[#17211D]">AgriTrack</span>
              </Link>
              <p className="mt-3 max-w-xs text-sm text-[#68736D]">
                Gestión agrícola inteligente, trazabilidad verificable y preventa
                transparente para AgroAn.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#68736D]">
                Enlaces útiles
              </p>
              <ul className="mt-3 space-y-2 text-sm font-medium text-[#17211D]">
                <li>
                  <Link href="/#inicio" className="hover:text-[#00a859]">
                    Inicio
                  </Link>
                </li>
                <li>
                  <Link href="/#parcelas-preventa" className="hover:text-[#00a859]">
                    Parcelas de preventa
                  </Link>
                </li>
                <li>
                  <Link href="/parcelas" className="hover:text-[#00a859]">
                    Catálogo público completo
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-[#00a859]">
                    Acceder al panel
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#68736D]">
                Contacto directo
              </p>
              <ul className="mt-3 space-y-2.5 text-sm text-[#17211D]">
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-[#00a859]" aria-hidden />
                  Pailón Sur, Santa Cruz, Bolivia
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-[#00a859]" aria-hidden />
                  <a
                    href={`tel:${TELEFONO_CONTACTO.replace(/\s+/g, "")}`}
                    className="hover:text-[#00a859]"
                  >
                    {TELEFONO_CONTACTO}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-[#00a859]" aria-hidden />
                  <a href={`mailto:${EMAIL_CONTACTO}`} className="hover:text-[#00a859]">
                    {EMAIL_CONTACTO}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-stone-100 pt-6 text-center text-xs text-[#68736D]">
            AgroAn © {new Date().getFullYear()} · AgriTrack. Todos los derechos
            reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
