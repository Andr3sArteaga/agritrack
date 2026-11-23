import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  LineChart,
  ListChecks,
  Mail,
  MapPin,
  MapPinned,
  MessageCircle,
  Phone,
  Ruler,
  ShieldCheck,
  Sprout,
  TrendingUp,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Advertencia } from "@/components/estado/advertencia";
import { EstadoBadge } from "@/components/estado/estado-badge";
import { EstadoVacio } from "@/components/estado/estado-vacio";
import { LandingNavbar } from "@/components/publico/landing-navbar";
import { PiePublico } from "@/components/publico/pie-publico";
import { ActivityItem } from "@/components/ui/activity-item";
import { CropChip } from "@/components/ui/crop-chip";
import { puedePublicarse, TEXTOS } from "@/lib/textos";
import type { DetalleParcelaPublico } from "@/lib/types";
import { GaleriaFotosCliente } from "./galeria-fotos-cliente";
import { MiniMapaCliente } from "./mini-mapa-cliente";
import { RendimientoChart } from "./rendimiento-chart";

async function obtenerDetalle(
  id: string,
): Promise<DetalleParcelaPublico | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL no configurada");

  const res = await fetch(`${apiUrl}/public/parcelas/${id}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("No se pudo cargar la parcela");
  return res.json();
}

export default async function ParcelaDetallePage(
  props: PageProps<"/parcelas/[id]">,
) {
  const { id } = await props.params;
  const parcela = await obtenerDetalle(id);
  if (!parcela) notFound();

  const { contacto } = parcela;
  const tieneContacto = Boolean(
    contacto.nombre || contacto.telefono || contacto.email,
  );
  const whatsappNumero = (contacto.telefono ?? "").replace(/[^0-9]/g, "");
  const whatsappHref = whatsappNumero
    ? `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(
        `Hola AgroAn, me interesa recibir información sobre la parcela "${parcela.nombre}" en AgriTrack.`,
      )}`
    : null;
  const publicarAdvertencia = puedePublicarse(TEXTOS.MENOS_DE_TRES_CAMPANAS);

  return (
    <div className="flex min-h-screen flex-col bg-fondo-suave text-tinta">
      <LandingNavbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {/* Barra de navegacion superior */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/parcelas"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-borde bg-superficie px-4 text-sm font-semibold text-tinta shadow-tarjeta transition-colors hover:border-marca-vivo hover:text-marca"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al catálogo de parcelas
          </Link>

          <Link
            href="/#parcelas-preventa"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-tinta-suave transition-colors hover:text-marca"
          >
            Inicio
          </Link>
        </div>

        {/* Encabezado principal unificado */}
        <section className="rounded-tarjeta border border-borde bg-superficie p-6 shadow-tarjeta sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-marca-vivo/12 px-3 py-1 text-xs font-bold text-marca-oscuro">
                  <Sprout className="h-3.5 w-3.5 text-marca-vivo" aria-hidden />
                  {parcela.temporadaActual ?? "Campaña actual"}
                </span>
                <CropChip cultivo={parcela.cultivoActual} />
                <span className="inline-flex items-center gap-1 rounded-full bg-marca-suave px-3 py-1 text-xs font-semibold text-marca">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  Disponible para preventa
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-bold tracking-tight text-tinta sm:text-3xl">
                {parcela.nombre}
              </h1>
              <p className="mt-2 flex items-center gap-2 text-base text-tinta-suave">
                <MapPin className="h-4 w-4 shrink-0 text-marca-vivo" aria-hidden />
                {parcela.ubicacionTexto}
              </p>
            </div>

            <div className="shrink-0 rounded-tarjeta border border-borde bg-fondo-suave px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-sm font-semibold text-tinta">
                  Registros protegidos contra cambios:
                </span>
                <EstadoBadge
                  estado={
                    parcela.registrosRevisados === 0
                      ? "SIN_DATOS"
                      : parcela.registrosVerificados
                        ? "BIEN"
                        : "CRITICO"
                  }
                />
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-tinta-suave">
                <ShieldCheck className="h-4 w-4 shrink-0 text-marca-vivo" aria-hidden />
                Verificados con cadena SHA-256
              </p>
            </div>
          </div>

          {/* 3 tarjetas resumen fáciles de leer */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-tarjeta border border-borde bg-fondo-suave p-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-tinta-suave">
                <Ruler className="h-4 w-4 text-marca-vivo" aria-hidden />
                Superficie total
              </p>
              <p className="mt-2 text-2xl font-bold text-tinta">
                {parcela.hectareas} ha
              </p>
              <p className="mt-1 text-xs text-tinta-suave">
                Área medida sobre polígono georreferenciado
              </p>
            </div>

            <div className="rounded-tarjeta border border-borde bg-fondo-suave p-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-tinta-suave">
                <Sprout className="h-4 w-4 text-marca-vivo" aria-hidden />
                Cultivo actual
              </p>
              <p className="mt-2 text-2xl font-bold text-tinta">
                {parcela.cultivoActual ?? "Sin campaña activa"}
              </p>
              <p className="mt-1 text-xs text-tinta-suave">
                {parcela.temporadaActual ?? "Sin temporada asignada"}
              </p>
            </div>

            <div className="rounded-tarjeta border border-borde bg-fondo-suave p-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-tinta-suave">
                <TrendingUp className="h-4 w-4 text-marca-vivo" aria-hidden />
                {TEXTOS.LINEA_BASE_ETIQUETA.texto}
              </p>
              {parcela.rendimientoEstimadoTnHa === null ? (
                <div className="mt-2">
                  <EstadoBadge estado="SIN_DATOS" />
                  <p className="mt-1.5 text-xs text-tinta-suave">
                    Sin cosechas previas para promediar
                  </p>
                </div>
              ) : (
                <>
                  <p className="mt-2 text-2xl font-bold text-marca">
                    {parcela.rendimientoEstimadoTnHa}{" "}
                    <span className="text-base font-semibold text-tinta">
                      t/ha
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-tinta-suave">
                    {parcela.produccionEstimadaTotalTn !== null
                      ? `≈ ${parcela.produccionEstimadaTotalTn} t en total · promedio histórico`
                      : TEXTOS.PRODUCCION_SIN_ESTIMACION.texto}
                  </p>
                  {publicarAdvertencia && (
                    <div className="mt-3">
                      <Advertencia
                        tipo="ATENCION"
                        titulo="No se puede validar"
                        texto={TEXTOS.MENOS_DE_TRES_CAMPANAS}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Contenido principal en 2 columnas */}
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Columna izquierda */}
          <div className="space-y-6 lg:col-span-7">
            {/* Mapa */}
            <section className="rounded-tarjeta border border-borde bg-superficie p-6 shadow-tarjeta">
              <h2 className="flex items-center gap-2.5 text-lg font-bold text-tinta">
                <span className="flex h-9 w-9 items-center justify-center rounded-tarjeta bg-marca-vivo/12 text-marca">
                  <MapPinned className="h-5 w-5" aria-hidden />
                </span>
                Dónde está la parcela (polígono georreferenciado)
              </h2>

              {parcela.poligono ? (
                <div className="mt-4 overflow-hidden rounded-tarjeta border border-borde">
                  <MiniMapaCliente poligono={parcela.poligono} />
                </div>
              ) : (
                <div className="mt-4">
                  <EstadoVacio mini titulo="Sin polígono dibujado">
                    <p>
                      Esta parcela aún no tiene su contorno dibujado en el mapa.
                    </p>
                  </EstadoVacio>
                </div>
              )}
            </section>

            {/* Fotos */}
            {parcela.fotos.length > 0 && (
              <section className="rounded-tarjeta border border-borde bg-superficie p-6 shadow-tarjeta">
                <h2 className="flex items-center gap-2.5 text-lg font-bold text-tinta">
                  <span className="flex h-9 w-9 items-center justify-center rounded-tarjeta bg-marca-vivo/12 text-marca">
                    <Camera className="h-5 w-5" aria-hidden />
                  </span>
                  Fotos de campo ({parcela.fotos.length})
                </h2>

                <GaleriaFotosCliente
                  fotos={parcela.fotos}
                  nombreParcela={parcela.nombre}
                />
              </section>
            )}

            {/* Historico de rendimiento */}
            <section className="rounded-tarjeta border border-borde bg-superficie p-6 shadow-tarjeta">
              <h2 className="flex items-center gap-2.5 text-lg font-bold text-tinta">
                <span className="flex h-9 w-9 items-center justify-center rounded-tarjeta bg-marca-vivo/12 text-marca">
                  <LineChart className="h-5 w-5" aria-hidden />
                </span>
                Histórico de rendimiento (campañas anteriores)
              </h2>

              <div className="mt-4">
                <RendimientoChart datos={parcela.historicoRendimiento} />
              </div>
            </section>
          </div>

          {/* Columna derecha */}
          <div className="space-y-6 lg:col-span-5">
            {/* Historial de cuidado */}
            <section className="rounded-tarjeta border border-borde bg-superficie p-6 shadow-tarjeta">
              <h2 className="flex items-center gap-2.5 text-lg font-bold text-tinta">
                <span className="flex h-9 w-9 items-center justify-center rounded-tarjeta bg-marca-vivo/12 text-marca">
                  <ListChecks className="h-5 w-5" aria-hidden />
                </span>
                Historial de cuidado (campaña actual)
              </h2>

              <div className="mt-4">
                {parcela.historialCuidado.length === 0 ? (
                  <EstadoVacio mini titulo="Todavía no hay labores registradas">
                    <p>Las labores de la campaña actual aparecerán aquí.</p>
                  </EstadoVacio>
                ) : (
                  <ol className="divide-y divide-borde">
                    {parcela.historialCuidado.map((item, index) => (
                      <li key={index}>
                        <ActivityItem tipo={item.tipo} fecha={item.fecha} descripcion={item.descripcion} />
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>

            {/* Tarjeta de contacto directo */}
            <section className="rounded-tarjeta bg-marca-oscuro p-6 text-white shadow-xl sm:p-7">
              <span className="inline-flex rounded-full bg-marca-vivo/25 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-marca-suave">
                CONTACTO DIRECTO
              </span>
              <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
                ¿Te interesa esta parcela? Contáctate con AgroAn
              </h2>
              <p className="mt-2 text-sm text-marca-suave/85">
                Comunícate directamente con nuestro equipo para recibir más
                información técnica o coordinar una visita en campo.
              </p>

              {tieneContacto ? (
                <div className="mt-5 space-y-3">
                  {contacto.nombre && (
                    <div className="flex items-center gap-3 rounded-tarjeta bg-white/10 px-4 py-3 text-sm">
                      <Building2
                        className="h-4 w-4 shrink-0 text-marca-vivo"
                        aria-hidden
                      />
                      <span>
                        Empresa: <strong>{contacto.nombre}</strong>
                      </span>
                    </div>
                  )}

                  {contacto.telefono && (
                    <a
                      href={`tel:${contacto.telefono.replace(/\s+/g, "")}`}
                      className="flex min-h-11 items-center gap-3 rounded-tarjeta bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                    >
                      <Phone
                        className="h-4 w-4 shrink-0 text-marca-vivo"
                        aria-hidden
                      />
                      {contacto.telefono}
                    </a>
                  )}

                  {contacto.email && (
                    <a
                      href={`mailto:${contacto.email}`}
                      className="flex min-h-11 items-center gap-3 rounded-tarjeta bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                    >
                      <Mail
                        className="h-4 w-4 shrink-0 text-marca-vivo"
                        aria-hidden
                      />
                      {contacto.email}
                    </a>
                  )}

                  {whatsappHref && (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-superficie px-6 text-sm font-bold text-marca-oscuro shadow-md transition-transform hover:-translate-y-0.5 hover:bg-marca-suave"
                    >
                      <MessageCircle
                        className="h-5 w-5 text-marca-vivo"
                        aria-hidden
                      />
                      Consultar por WhatsApp
                    </a>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-tarjeta border border-white/15 bg-white/10 p-4 text-sm text-marca-suave">
                  Todavía no hay datos de contacto configurados para esta parcela.
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <PiePublico />
    </div>
  );
}
