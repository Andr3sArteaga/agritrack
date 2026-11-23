import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

const TELEFONO_CONTACTO = process.env.NEXT_PUBLIC_CONTACTO_TELEFONO ?? "+591 70000000";
const EMAIL_CONTACTO = process.env.NEXT_PUBLIC_CONTACTO_EMAIL ?? "contacto@agroan.com";
const WHATSAPP_HREF = `https://wa.me/${TELEFONO_CONTACTO.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
  "Hola AgroAn, me interesa recibir información sobre las parcelas disponibles en AgriTrack.",
)}`;

/** Cierre de las paginas publicas: marca grande, contacto y enlaces (solo los que existen). */
export function PiePublico() {
  return (
    <footer className="overflow-hidden bg-superficie">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24">
        <p
          aria-hidden
          className="select-none whitespace-nowrap pb-[0.18em] font-titulo text-[25vw] leading-[0.85] text-marca-oscuro xl:text-[23rem]"
        >
          AgriTrack
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="font-titulo text-4xl leading-tight text-tinta sm:text-5xl">
              ¿Te interesa una parcela?
            </h2>
            <p className="mt-3 max-w-sm text-base text-tinta-suave">
              Habla directamente con el equipo de AgroAn en Santa Cruz, Bolivia.
            </p>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-tinta px-6 text-base font-semibold text-white transition-colors hover:bg-marca-oscuro"
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              Escribir por WhatsApp
            </a>
          </div>

          <nav aria-label="Enlaces del pie" className="grid gap-8 sm:grid-cols-3 lg:col-span-7">
            <div>
              <p className="text-sm font-semibold text-tinta">Explora</p>
              <ul className="mt-2 text-sm text-tinta-suave">
                <li>
                  <Link href="/#inicio" className="inline-flex min-h-11 items-center hover:text-tinta">
                    Inicio
                  </Link>
                </li>
                <li>
                  <Link href="/#parcelas-preventa" className="inline-flex min-h-11 items-center hover:text-tinta">
                    Parcelas en preventa
                  </Link>
                </li>
                <li>
                  <Link href="/parcelas" className="inline-flex min-h-11 items-center hover:text-tinta">
                    Catálogo completo
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-tinta">Equipo AgroAn</p>
              <ul className="mt-2 text-sm text-tinta-suave">
                <li>
                  <Link href="/login" className="inline-flex min-h-11 items-center hover:text-tinta">
                    Acceder al panel
                  </Link>
                </li>
                <li>
                  <Link href="/solicitar-acceso" className="inline-flex min-h-11 items-center hover:text-tinta">
                    Solicitar acceso
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-tinta">Contacto</p>
              <ul className="mt-2 text-sm text-tinta-suave">
                <li className="flex min-h-11 items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-marca" aria-hidden />
                  Pailón Sur, Santa Cruz
                </li>
                <li>
                  <a
                    href={`tel:${TELEFONO_CONTACTO.replace(/\s+/g, "")}`}
                    className="inline-flex min-h-11 items-center gap-2 hover:text-tinta"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-marca" aria-hidden />
                    {TELEFONO_CONTACTO}
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${EMAIL_CONTACTO}`}
                    className="inline-flex min-h-11 items-center gap-2 break-all hover:text-tinta"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-marca" aria-hidden />
                    {EMAIL_CONTACTO}
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <p className="mt-12 border-t border-borde py-6 text-center text-sm text-tinta-suave">
          AgroAn © {new Date().getFullYear()} · AgriTrack
        </p>
      </div>
    </footer>
  );
}
