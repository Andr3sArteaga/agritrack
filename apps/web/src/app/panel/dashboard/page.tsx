"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarClock,
  LayoutDashboard,
  LineChart,
  MapPinned,
  Ruler,
  Tractor,
  Wheat,
} from "lucide-react";
import { EnlaceBoton } from "@/components/enlace-boton";
import { ContadorEstados } from "@/components/estado/contador-estados";
import { EstadoVacio } from "@/components/estado/estado-vacio";
import { EstimacionRendimiento } from "@/components/estado/estimacion-rendimiento";
import { PanelEstadoParcela } from "@/components/estado/panel-estado-parcela";
import { SelectorParcelas } from "@/components/estado/selector-parcelas";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import { TarjetaMetrica } from "@/components/tarjeta-metrica";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useResumenesParcelas } from "@/lib/cargar-resumen";
import { contarPorEstado } from "@/lib/estado";
import { formatearFecha } from "@/lib/format";
import type { ResumenDashboard } from "@/lib/types";
import { DashboardChart } from "./dashboard-chart";

export default function DashboardPage() {
  const { usuario } = useAuth();
  const router = useRouter();
  const [resumen, setResumen] = useState<ResumenDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elegidaId, setElegidaId] = useState<string | null>(null);
  const { datos: parcelas, error: errorParcelas } = useResumenesParcelas();

  useEffect(() => {
    if (usuario?.rol === "OPERATIVO") {
      router.replace("/panel/parcelas");
    }
  }, [usuario, router]);

  useEffect(() => {
    api
      .get<ResumenDashboard>("/reportes/dashboard")
      .then((res) => setResumen(res.data))
      .catch((err) => setError(apiErrorMessage(err, "No se pudo cargar el resumen")));
  }, []);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!resumen) return <p className="text-stone-600">Cargando resumen...</p>;

  const proxima = resumen.prediccionProximaCampana;
  const elegida = parcelas?.find((p) => p.parcelaId === elegidaId) ?? parcelas?.[0];

  return (
    <div className="space-y-10">
      <EncabezadoPagina
        icono={LayoutDashboard}
        titulo="Resumen"
        descripcion="Estado de tus parcelas y de la operación"
      />

      <section className="space-y-4" aria-labelledby="estado-parcelas">
        <h2 id="estado-parcelas" className="flex items-center gap-2 text-[22px] font-bold text-stone-900">
          <MapPinned className="h-6 w-6 text-emerald-700" aria-hidden />
          Estado de las parcelas
        </h2>

        {errorParcelas ? (
          <p className="text-red-700">{errorParcelas}</p>
        ) : parcelas === null ? (
          <p className="text-stone-600">Cargando el estado de las parcelas...</p>
        ) : parcelas.length === 0 || !elegida ? (
          <EstadoVacio titulo="Todavía no hay parcelas">
            <p>Crea la primera para empezar a registrar su trabajo.</p>
            {usuario?.rol === "JEFE" && (
              <p>
                <EnlaceBoton href="/panel/parcelas">Crear parcela</EnlaceBoton>
              </p>
            )}
          </EstadoVacio>
        ) : (
          <>
            <ContadorEstados
              conteo={contarPorEstado(parcelas.map((p) => p.estado))}
              sinDatosBasicos={parcelas.filter((p) => p.estado === "SIN_DATOS" && p.sinDatosBasicos).length}
            />
            <SelectorParcelas
              resumenes={parcelas}
              seleccionadaId={elegida.parcelaId}
              onSeleccionar={setElegidaId}
            />
            <PanelEstadoParcela
              resumen={elegida}
              mostrarEnlace
              idPestana={`pestana-${elegida.parcelaId}`}
            />
          </>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="resumen-operacion">
        <h2 id="resumen-operacion" className="flex items-center gap-2 text-[22px] font-bold text-stone-900">
          <Tractor className="h-6 w-6 text-emerald-700" aria-hidden />
          Resumen de la operación
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TarjetaMetrica
            icono={Ruler}
            etiqueta="Hectáreas totales"
            valor={`${resumen.hectareasTotales} ha`}
            ayuda="Suma de la superficie de las parcelas activas."
          />
          <TarjetaMetrica
            icono={Tractor}
            etiqueta="Campañas en curso"
            valor={resumen.campanasEnCurso}
            ayuda="Campañas que se están ejecutando ahora (sembradas y sin cosechar)."
          />
          <TarjetaMetrica
            icono={Wheat}
            ayuda="Rendimiento de la cosecha más reciente, en toneladas por hectárea (t/ha)."
            etiqueta="Última cosecha"
            valor={
              resumen.ultimaCosecha
                ? `${resumen.ultimaCosecha.rendimientoTnHa} t/ha`
                : "Sin datos"
            }
            nota={
              resumen.ultimaCosecha
                ? `${resumen.ultimaCosecha.parcelaNombre} · ${formatearFecha(resumen.ultimaCosecha.fecha)}`
                : undefined
            }
          />
        </div>

        <h3 className="pt-2 text-lg font-bold text-stone-900">Estimación de la próxima campaña</h3>
        {proxima ? (
          <EstimacionRendimiento
            rendimientoTnHa={proxima.rendimientoEstimadoTnHa}
            campanasUsadas={proxima.campanasHistoricasUsadas}
            contexto={`${proxima.parcelaNombre} · ${proxima.cultivoNombre} · ${proxima.temporada}`}
          />
        ) : (
          <EstadoVacio mini titulo="Estimación de la próxima campaña: sin datos">
            <p>No hay campañas planificadas.</p>
          </EstadoVacio>
        )}
      </section>

      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold text-stone-900">
          <LineChart className="h-5 w-5 text-emerald-700" aria-hidden />
          Histórico de rendimiento
        </h2>
        <div className="mt-4">
          <DashboardChart datos={resumen.historicoRendimiento} />
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold text-stone-900">
          <CalendarClock className="h-5 w-5 text-emerald-700" aria-hidden />
          Próximas cosechas
        </h2>
        {resumen.proximasCosechas.length === 0 ? (
          <p className="mt-3 text-stone-600">
            No hay campañas en curso con fecha de finalización.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100">
            {resumen.proximasCosechas.map((cosecha) => (
              <li key={cosecha.campanaId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-medium text-stone-900">
                  {cosecha.parcelaNombre} · {cosecha.cultivoNombre}
                </span>
                <span className="text-stone-600">{formatearFecha(cosecha.fechaFin)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
