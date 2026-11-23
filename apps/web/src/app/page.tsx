import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  BrainCircuit,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  DatabaseZap,
  Handshake,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sprout,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { LandingNavbar } from "@/components/publico/landing-navbar";
import { LandingPreventaSeccion } from "@/components/publico/landing-preventa-seccion";
import { MapaPreventaCliente } from "@/components/publico/mapa-preventa-cliente";
import type { CatalogoParcela } from "@/lib/types";

const TELEFONO_CONTACTO =
  process.env.NEXT_PUBLIC_CONTACTO_TELEFONO ?? "+591 70000000";
const EMAIL_CONTACTO =
  process.env.NEXT_PUBLIC_CONTACTO_EMAIL ?? "contacto@agroan.com";

async function obtenerParcelasPublicas(): Promise<CatalogoParcela[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];

  try {
    const res = await fetch(`${apiUrl}/public/parcelas`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as CatalogoParcela[]) : [];
  } catch {
    return [];
  }
}

const HERO_BENEFICIOS = [
  "Registros auditables con huella",
  "Promedio histórico por cultivo",
  "Ubicación geográfica exacta por polígono",
];

const CARACTERISTICAS_FUNCIONA: {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
}[] = [
  {
    icono: ClipboardCheck,
    titulo: "Registro completo",
    descripcion:
      "Cada siembra, aplicación, monitoreo de suelo y lluvia diaria queda anotada con fecha y responsable.",
  },
  {
    icono: BrainCircuit,
    titulo: "Inteligencia artificial",
    descripcion:
      "El modelo Random Forest compara las variables de campaña frente al histórico real del cultivo.",
  },
  {
    icono: Camera,
    titulo: "Validado con evidencias",
    descripcion:
      "Bitácora fotográfica de campo, análisis de laboratorio y verificación criptográfica de integridad.",
  },
  {
    icono: ShieldAlert,
    titulo: "Prevención de riesgos",
    descripcion:
      "Alertas tempranas por eventos climáticos adversos y seguimiento continuo de cada lote activo.",
  },
];

const PASOS_TIMELINE: {
  numero: string;
  paso: string;
  titulo: string;
  descripcion: string;
  icono: LucideIcon;
}[] = [
  {
    numero: "01",
    paso: "PASO 1",
    titulo: "Ve las parcelas disponibles",
    descripcion: "Compara ubicación, hectáreas y cultivo.",
    icono: Search,
  },
  {
    numero: "02",
    paso: "PASO 2",
    titulo: "Revisa sus detalles",
    descripcion: "Consulta el historial y la producción estimada.",
    icono: TrendingUp,
  },
  {
    numero: "03",
    paso: "PASO 3",
    titulo: "Contáctate con AgroAn",
    descripcion: "Resuelve tus dudas y acuerda la compra directamente.",
    icono: Handshake,
  },
];

const PILARES_CONFIANZA: {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
}[] = [
  {
    icono: ShieldCheck,
    titulo: "Trazabilidad inmutable",
    descripcion:
      "Cada labor agrícola forma parte de una cadena SHA-256 que detecta al instante cualquier modificación posterior.",
  },
  {
    icono: BarChart3,
    titulo: "Modelo predictivo transparente",
    descripcion:
      "Proyecciones en t/ha basadas únicamente en variables previas a la siembra y validadas frente a la línea base histórica.",
  },
  {
    icono: Lock,
    titulo: "Seguridad e integridad de datos",
    descripcion:
      "Control estricto por roles operativos y publicación selectiva de lotes y fotografías autorizadas para preventa.",
  },
];

export default async function LandingPage() {
  const parcelas = await obtenerParcelasPublicas();
  const parcelasConPoligono = parcelas.flatMap((p) =>
    p.poligono
      ? [{ id: p.id, nombre: p.nombre, cultivo: p.cultivoActual, hectareas: p.hectareas, poligono: p.poligono }]
      : [],
  );
  const hectareasPublicadas =
    Math.round(parcelas.reduce((total, p) => total + p.hectareas, 0) * 100) / 100;
  const whatsappNumero = TELEFONO_CONTACTO.replace(/[^0-9]/g, "");
  const whatsappHref = `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(
    "Hola AgroAn, me interesa recibir información sobre las parcelas disponibles en AgriTrack.",
  )}`;

  return (
    <div className="flex min-h-screen flex-col bg-fondo-suave text-tinta">
      {/* A. NAVBAR STICKY */}
      <LandingNavbar sobreHero />

      <main className="flex-1">
        {/* B. HERO: cielo claro, titulo con serifa y el mapa real de las parcelas en preventa.
            El pt incluye los 80 px de la barra superpuesta. */}
        <section
          id="inicio"
          className="relative overflow-hidden bg-linear-to-b from-cielo via-hueso to-superficie pt-32 sm:pt-36 lg:pt-40"
        >
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h1 className="font-titulo text-5xl leading-[1.05] text-marca-oscuro sm:text-6xl lg:text-7xl">
              Encuentra tu próxima <span className="italic text-marca">producción</span> de
              forma rápida y sencilla
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-tinta-suave sm:text-lg">
              Conoce parcelas reales de Pailón Sur, Santa Cruz, con cada labor registrada, su
              ubicación exacta y el promedio histórico de su cultivo.
            </p>
            <ul className="mt-6 flex flex-wrap justify-center gap-2">
              {HERO_BENEFICIOS.map((beneficio) => (
                <li
                  key={beneficio}
                  className="inline-flex items-center gap-1.5 rounded-full border border-borde bg-superficie/80 px-3 py-1.5 text-sm font-medium text-tinta"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-marca" aria-hidden />
                  {beneficio}
                </li>
              ))}
            </ul>
          </div>

          {/* Tarjeta del mapa, apoyada sobre el paisaje */}
          <div className="relative z-10 mx-auto mt-10 max-w-5xl px-4 sm:mt-12 sm:px-6">
            <div className="rounded-tarjeta border border-borde bg-superficie p-3 shadow-flotante sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1 pb-3">
                <div>
                  <p className="text-sm text-tinta-suave">Parcelas en preventa</p>
                  <p className="text-lg font-semibold text-tinta">Pailón Sur, Santa Cruz</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {parcelas.length > 0 ? (
                    <>
                      <span className="rounded-full bg-fondo px-3 py-1 text-sm font-medium text-tinta">
                        {parcelas.length} {parcelas.length === 1 ? "parcela" : "parcelas"}
                      </span>
                      <span className="rounded-full bg-fondo px-3 py-1 text-sm font-medium text-tinta">
                        {hectareasPublicadas} ha
                      </span>
                    </>
                  ) : (
                    <span className="rounded-full border border-dashed border-sindatos-borde bg-sindatos-fondo px-3 py-1 text-sm font-medium text-sindatos-texto">
                      Sin parcelas publicadas
                    </span>
                  )}
                  <Link
                    href="/parcelas"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-tinta px-4 text-sm font-semibold text-white transition-colors hover:bg-marca-oscuro"
                  >
                    Ver catálogo
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
              <div className="h-64 overflow-hidden rounded-control sm:h-80 lg:h-[380px]">
                <MapaPreventaCliente parcelas={parcelasConPoligono} />
              </div>
            </div>
          </div>

          {/* Paisaje recortado en "V" */}
          <div className="relative -mt-36 sm:-mt-52">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/banner-field.jpg"
              alt=""
              className="h-[380px] w-full object-cover [clip-path:polygon(0_0,100%_0,100%_60%,55%_95%,50%_100%,45%_95%,0_60%)] sm:h-[520px]"
            />
          </div>
        </section>

        {/* C. BANNER "TRANSPARENCIA TOTAL" SUPERPUESTO */}
        <section
          aria-label="Transparencia total"
          className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6"
        >
          <div className="grid items-center gap-6 overflow-hidden rounded-tarjeta border border-marca-vivo/30 bg-marca-noche p-5 text-white shadow-2xl sm:p-8 lg:grid-cols-12">
            <div className="overflow-hidden rounded-tarjeta border border-white/10 lg:col-span-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/banner-field.jpg"
                alt="Surcos de siembra agrícola monitoreados en Pailón Sur"
                className="h-48 w-full object-cover sm:h-56"
              />
            </div>

            <div className="lg:col-span-7 lg:pl-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-marca-vivo/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-marca-suave">
                <Award className="h-3.5 w-3.5" aria-hidden />
                Respaldo técnico real
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Transparencia total en cada hectárea sembrada
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-marca-suave/85 sm:text-base">
                Consulta con claridad qué se sembró, cuándo se aplicaron insumos,
                cómo evolucionó el clima y qué cosechas históricas respaldan la
                proyección de cada lote disponible para preventa.
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white">
                  <ShieldCheck className="h-4 w-4 text-marca-vivo" aria-hidden />
                  Cadena SHA-256 verificable
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white">
                  <DatabaseZap className="h-4 w-4 text-marca-vivo" aria-hidden />
                  Histórico multi-campaña
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white">
                  <MapPin className="h-4 w-4 text-marca-vivo" aria-hidden />
                  Polígonos georreferenciados
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* D. SECCIÓN "QUIÉNES SOMOS" */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-6">
              <div className="relative overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/team.jpg"
                  alt="Equipo técnico y productores agrícolas de AgroAn en campo"
                  className="h-72 w-full object-cover sm:h-[410px]"
                />
              </div>
            </div>

            <div className="lg:col-span-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-marca-vivo/12 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-marca">
                Sobre AgroAn
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-tinta sm:text-3xl">
                Quiénes somos
              </h2>
              <p className="mt-4 text-base leading-relaxed text-tinta/90">
                Somos una empresa agrícola ubicada en{" "}
                <strong>Pailón Sur, Santa Cruz</strong>, dedicada a la producción
                extensiva de granos estratégicos con enfoque en eficiencia
                operativa y trazabilidad digital.
              </p>
              <p className="mt-3 text-base leading-relaxed text-tinta-suave">
                A través de <strong>AgriTrack</strong> ordenamos cada labor de
                campo, protegemos la autenticidad de nuestros registros y
                brindamos información confiable a compradores e inversionistas
                desde la siembra hasta la cosecha.
              </p>
            </div>
          </div>
        </section>

        {/* E. SECCIÓN "CÓMO FUNCIONA AGRITRACK" */}
        <section id="como-funciona" className="bg-superficie py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex rounded-full bg-marca-vivo/12 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-marca">
                Metodología verificable
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-tinta sm:text-3xl">
                Cómo funciona AgriTrack
              </h2>
              <p className="mt-3 text-base text-tinta-suave">
                Del monitoreo diario en campo a una preventa transparente con
                respaldo técnico en tres pasos simples.
              </p>
            </div>

            {/* Fila 1: 4 Tarjetas de Características */}
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {CARACTERISTICAS_FUNCIONA.map(({ icono: Icono, titulo, descripcion }) => (
                <article
                  key={titulo}
                  className="rounded-tarjeta border border-borde bg-superficie p-6 shadow-tarjeta transition-all hover:-translate-y-0.5 hover:border-marca-vivo/50 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-tarjeta bg-marca-vivo/12 text-marca-vivo">
                    <Icono className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-tinta">
                    {titulo}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-tinta-suave">
                    {descripcion}
                  </p>
                </article>
              ))}
            </div>

            {/* Fila 2: Línea de Tiempo Horizontal con puntos circulares (estilo referencia) */}
            <div className="mt-12 rounded-tarjeta border border-borde bg-superficie p-6 shadow-tarjeta sm:p-8">
              <div className="relative grid gap-6 md:grid-cols-3">
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-[16.66%] right-[16.66%] top-16 z-10 hidden border-t-2 border-dashed border-marca/25 md:block"
                />

                {PASOS_TIMELINE.map(
                  ({ numero, paso, titulo, descripcion, icono: Icono }) => (
                    <div
                      key={numero}
                      className="relative z-0 flex flex-col items-center rounded-tarjeta bg-fondo-suave px-6 py-8 text-center"
                    >
                      <div className="relative z-20 flex h-16 w-16 items-center justify-center rounded-full bg-marca text-xl font-bold text-white ring-4 ring-white shadow-tarjeta">
                        <span>{numero}</span>
                        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-marca-suave text-marca ring-2 ring-white">
                          <Icono className="h-3.5 w-3.5" aria-hidden />
                        </span>
                      </div>

                      <span className="mt-4 inline-flex rounded-full bg-marca-suave px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-marca">
                        {paso}
                      </span>

                      <h3 className="mt-3 text-base font-bold text-tinta">
                        {titulo}
                      </h3>
                      <p className="mt-1.5 max-w-xs text-sm text-tinta-suave">
                        {descripcion}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        {/* F. SECCIÓN "PARCELAS DISPONIBLES PARA PREVENTA" + MAPA OSCURO */}
        <LandingPreventaSeccion parcelasReales={parcelas} />

        {/* G. SECCIÓN "POR QUÉ CONFIAR" */}
        <section className="bg-superficie py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full bg-marca-vivo/12 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-marca">
                Garantía operativa
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-tinta sm:text-3xl">
                Por qué confiar en AgriTrack
              </h2>
              <p className="mt-2 text-base text-tinta-suave">
                Diseñado junto al equipo de campo para evitar información
                fragmentada y ofrecer evidencia concreta en cada campaña.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {PILARES_CONFIANZA.map(({ icono: Icono, titulo, descripcion }) => (
                <article
                  key={titulo}
                  className="rounded-tarjeta border border-borde bg-fondo-suave p-7"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-tarjeta bg-marca-oscuro text-marca-vivo">
                    <Icono className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-tinta">
                    {titulo}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-tinta-suave">
                    {descripcion}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* H. CTA INFERIOR */}
        <section className="bg-superficie pb-16 sm:pb-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex flex-col items-start justify-between gap-6 rounded-tarjeta bg-marca-oscuro p-7 text-white shadow-xl sm:p-10 lg:flex-row lg:items-center">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-tarjeta bg-marca-vivo text-white shadow-md">
                  <MessageCircle className="h-7 w-7" aria-hidden />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    ¿Te interesa una parcela? Hablemos
                  </h2>
                  <p className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-marca-suave/90 sm:text-base">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                      <Phone className="h-4 w-4 text-marca-vivo" aria-hidden />
                      {TELEFONO_CONTACTO}
                    </span>
                    <span className="hidden text-marca-suave/50 sm:inline">
                      ·
                    </span>
                    <span>
                      Atención directa con AgroAn en Santa Cruz, Bolivia
                    </span>
                  </p>
                </div>
              </div>

              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-superficie px-7 text-sm font-bold text-marca-oscuro shadow-md transition-transform hover:-translate-y-0.5 hover:bg-marca-suave sm:w-auto sm:text-base"
              >
                <MessageCircle className="h-5 w-5 text-marca-vivo" aria-hidden />
                Contactar por WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER MINIMALISTA */}
      <footer className="border-t border-borde bg-superficie">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="grid gap-8 md:grid-cols-3 md:items-start">
            {/* Izquierda: Logo */}
            <div>
              <Link href="#inicio" className="inline-flex min-h-11 items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-tarjeta bg-marca-oscuro text-marca-vivo">
                  <Sprout className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-lg font-bold text-tinta">
                  AgriTrack
                </span>
              </Link>
              <p className="mt-3 max-w-xs text-sm text-tinta-suave">
                Gestión agrícola inteligente, trazabilidad verificable y preventa
                transparente para AgroAn.
              </p>
            </div>

            {/* Centro: Enlaces útiles */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-tinta-suave">
                Enlaces útiles
              </p>
              <ul className="mt-3 space-y-2 text-sm font-medium text-tinta">
                <li>
                  <a href="#inicio" className="inline-flex min-h-11 items-center hover:text-marca">
                    Inicio
                  </a>
                </li>
                <li>
                  <a href="#parcelas-preventa" className="inline-flex min-h-11 items-center hover:text-marca">
                    Parcelas de preventa
                  </a>
                </li>
                <li>
                  <Link href="/parcelas" className="inline-flex min-h-11 items-center hover:text-marca">
                    Catálogo público completo
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="inline-flex min-h-11 items-center hover:text-marca">
                    Acceder al panel
                  </Link>
                </li>
              </ul>
            </div>

            {/* Derecha: Contacto */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-tinta-suave">
                Contacto directo
              </p>
              <ul className="mt-3 space-y-2.5 text-sm text-tinta">
                <li className="flex items-center gap-2">
                  <MapPin
                    className="h-4 w-4 shrink-0 text-marca-vivo"
                    aria-hidden
                  />
                  Pailón Sur, Santa Cruz, Bolivia
                </li>
                <li className="flex items-center gap-2">
                  <Phone
                    className="h-4 w-4 shrink-0 text-marca-vivo"
                    aria-hidden
                  />
                  <a
                    href={`tel:${TELEFONO_CONTACTO.replace(/\s+/g, "")}`}
                    className="inline-flex min-h-11 items-center hover:text-marca"
                  >
                    {TELEFONO_CONTACTO}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail
                    className="h-4 w-4 shrink-0 text-marca-vivo"
                    aria-hidden
                  />
                  <a
                    href={`mailto:${EMAIL_CONTACTO}`}
                    className="inline-flex min-h-11 items-center hover:text-marca"
                  >
                    {EMAIL_CONTACTO}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-fondo pt-6 text-center text-xs text-tinta-suave">
            AgroAn © {new Date().getFullYear()} · AgriTrack. Todos los derechos
            reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
