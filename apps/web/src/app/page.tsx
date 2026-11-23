import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CloudRain,
  FlaskConical,
  Leaf,
  ClipboardCheck,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
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

/** Lo que un comprador puede revisar de cada parcela en la parte publica (todo existe hoy). */
const MODULOS_PUBLICOS: {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  destacado?: boolean;
}[] = [
  {
    icono: ClipboardCheck,
    titulo: "Historial de labores",
    descripcion: "Siembra, fumigación, riego y cosecha de la campaña actual, cada una con su fecha.",
  },
  {
    icono: ShieldCheck,
    titulo: "Registros protegidos",
    descripcion:
      "Cada labor se encadena con una huella SHA-256: si alguien cambia un dato guardado, se nota.",
    destacado: true,
  },
  {
    icono: MapPin,
    titulo: "Ubicación exacta",
    descripcion:
      "El contorno de cada parcela está dibujado sobre el mapa satelital, con su superficie en hectáreas.",
  },
  {
    icono: TrendingUp,
    titulo: "Promedio histórico",
    descripcion:
      "El rendimiento promedio (t/ha) de las campañas anteriores del cultivo, cuando existe.",
  },
];

/** Escalon de cada tarjeta en pantalla grande, como en la referencia. */
const ESCALON_TARJETA = ["lg:mt-0", "lg:mt-28", "lg:mt-10", "lg:mt-40"];

const PASOS_COMPRA: { numero: string; titulo: string; descripcion: string }[] = [
  {
    numero: "01",
    titulo: "Ve las parcelas disponibles",
    descripcion: "Compara su ubicación, hectáreas y cultivo en el catálogo.",
  },
  {
    numero: "02",
    titulo: "Revisa sus detalles",
    descripcion: "Mira su mapa, sus labores y el promedio histórico de su cultivo.",
  },
  {
    numero: "03",
    titulo: "Contáctate con AgroAn",
    descripcion: "Resuelve tus dudas y acuerda la compra directamente con el equipo.",
  },
];

/** Iconos alrededor de la foto: lo que el equipo registra en el campo (decorativos). */
const ICONOS_CAMPO: { icono: LucideIcon; posicion: string }[] = [
  { icono: Sprout, posicion: "left-0 top-[62%] sm:left-[4%]" },
  { icono: FlaskConical, posicion: "left-[6%] top-[22%] sm:left-[16%]" },
  { icono: CloudRain, posicion: "right-[6%] top-[22%] sm:right-[16%]" },
  { icono: ClipboardCheck, posicion: "right-0 top-[62%] sm:right-[4%]" },
];

/** Icono en un circulo, dentro de una frase (decorativo: el texto ya dice lo mismo). */
function BurbujaIcono({ icono: Icono, fondo }: { icono: LucideIcon; fondo: string }) {
  return (
    <span
      aria-hidden
      className={`ml-2 mr-0.5 inline-grid size-10 place-items-center rounded-full align-middle text-marca-oscuro sm:size-14 ${fondo}`}
    >
      <Icono className="h-5 w-5 sm:h-6 sm:w-6" />
    </span>
  );
}

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

        {/* C. FRASE DE PRESENTACION con iconos dentro del texto */}
        <section aria-label="Qué es AgriTrack" className="relative overflow-hidden bg-superficie py-20 sm:py-28">
          <Sprout
            aria-hidden
            className="pointer-events-none absolute -left-10 top-10 h-56 w-56 text-fondo"
            strokeWidth={1}
          />
          <Leaf
            aria-hidden
            className="pointer-events-none absolute -right-8 bottom-6 h-64 w-64 text-fondo"
            strokeWidth={1}
          />
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
            <span className="inline-flex rounded-full border border-marca/30 px-3.5 py-1 text-sm font-medium text-marca">
              Sobre AgriTrack
            </span>
            <p className="mt-6 font-titulo text-3xl leading-snug text-marca-oscuro sm:text-5xl sm:leading-tight">
              <span className="text-marca">AgriTrack ordena el trabajo de campo de AgroAn:</span>{" "}
              registra cada labor
              <BurbujaIcono icono={ClipboardCheck} fondo="bg-cielo" />, protege cada registro
              <BurbujaIcono icono={ShieldCheck} fondo="bg-marca-suave" /> y muestra sus parcelas
              tal como están
              <BurbujaIcono icono={MapPin} fondo="bg-lima" />.
            </p>
          </div>
        </section>

        {/* C2. LO QUE PUEDES REVISAR: 4 tarjetas escalonadas sobre fondo salvia */}
        <section aria-labelledby="titulo-modulos" className="bg-salvia py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
              <h2
                id="titulo-modulos"
                className="font-titulo text-4xl leading-[1.05] text-tinta sm:text-6xl lg:col-span-7"
              >
                Lo que puedes revisar de cada parcela
              </h2>
              <p className="max-w-md text-base leading-relaxed text-tinta lg:col-span-4 lg:col-start-9">
                Información real, cargada por el equipo de AgroAn en el campo. Si un dato todavía
                no existe, lo verás como &ldquo;Sin datos&rdquo;.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {MODULOS_PUBLICOS.map(({ icono: Icono, titulo, descripcion, destacado }, indice) => (
                <article
                  key={titulo}
                  className={`flex min-h-72 flex-col justify-between p-6 pb-14 [clip-path:polygon(0_0,100%_0,100%_78%,78%_100%,0_100%)] ${
                    destacado ? "bg-lima" : "bg-superficie"
                  } ${ESCALON_TARJETA[indice]}`}
                >
                  <div>
                    <span className="grid size-11 place-items-center rounded-full bg-tinta/5 text-tinta">
                      <Icono className="h-5 w-5" aria-hidden />
                    </span>
                    <h3 className="mt-5 text-2xl font-semibold leading-tight text-tinta">{titulo}</h3>
                  </div>
                  <p className="mt-6 max-w-[16rem] text-sm leading-relaxed text-tinta">{descripcion}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* D. QUIENES SOMOS + COMO COMPRAR: foto organica sobre un arco, y los 3 pasos */}
        <section id="como-funciona" aria-labelledby="titulo-quienes" className="overflow-hidden bg-superficie pt-16 sm:pt-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <span className="inline-flex rounded-full border border-marca/30 px-3.5 py-1 text-sm font-medium text-marca">
                  Quiénes somos
                </span>
                <h2
                  id="titulo-quienes"
                  className="mt-4 font-titulo text-4xl leading-[1.05] text-tinta sm:text-6xl"
                >
                  Producción agrícola en Pailón Sur, con cada paso registrado
                </h2>
              </div>
              <p className="max-w-md text-base leading-relaxed text-tinta-suave lg:col-span-4 lg:col-start-9">
                AgroAn produce granos en <strong className="text-tinta">Pailón Sur, Santa Cruz</strong>.
                Con AgriTrack ordena cada labor de campo y comparte información confiable con
                compradores e inversionistas, desde la siembra hasta la cosecha.
              </p>
            </div>
          </div>

          {/* Foto con forma organica, sobre un arco verde a lima */}
          <div className="relative mx-auto mt-14 max-w-6xl px-4 pb-16 sm:mt-20 sm:px-6 sm:pb-24">
            <div
              aria-hidden
              className="absolute inset-x-[-30%] top-[38%] bottom-0 rounded-t-[50%] bg-linear-to-b from-marca-vivo/35 via-lima/30 to-superficie sm:inset-x-[-10%]"
            />
            {/* Foto e iconos en su propia caja: los iconos se ubican respecto a la foto, no a los pasos */}
            <div className="relative mx-auto max-w-3xl">
              {ICONOS_CAMPO.map(({ icono: Icono, posicion }) => (
                <span
                  key={posicion}
                  aria-hidden
                  className={`absolute z-10 grid size-11 place-items-center rounded-control bg-superficie text-marca shadow-tarjeta sm:size-14 ${posicion}`}
                >
                  <Icono className="h-5 w-5 sm:h-6 sm:w-6" />
                </span>
              ))}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/team.jpg"
                alt="Equipo de AgroAn en el campo"
                className="relative mx-auto h-72 w-60 rounded-[32px_96px] object-cover shadow-flotante sm:h-[400px] sm:w-[360px] sm:rounded-[40px_140px]"
              />
            </div>

            {/* Como comprar */}
            <ol className="relative mt-14 grid gap-4 sm:mt-20 md:grid-cols-3">
              {PASOS_COMPRA.map(({ numero, titulo, descripcion }) => (
                <li
                  key={numero}
                  className="rounded-tarjeta border border-borde bg-superficie/90 p-6 backdrop-blur-sm"
                >
                  <span className="font-titulo text-5xl leading-none text-marca">{numero}</span>
                  <h3 className="mt-4 text-lg font-semibold text-tinta">{titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-tinta-suave">{descripcion}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* F. SECCIÓN "PARCELAS DISPONIBLES PARA PREVENTA" + MAPA OSCURO */}
        <div className="bg-hueso">
          <LandingPreventaSeccion parcelasReales={parcelas} />
        </div>

      </main>

      {/* H. CIERRE: marca grande, contacto y enlaces (solo los que existen) */}
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
                href={whatsappHref}
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
                    <a href="#inicio" className="inline-flex min-h-11 items-center hover:text-tinta">
                      Inicio
                    </a>
                  </li>
                  <li>
                    <a href="#parcelas-preventa" className="inline-flex min-h-11 items-center hover:text-tinta">
                      Parcelas en preventa
                    </a>
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
    </div>
  );
}
