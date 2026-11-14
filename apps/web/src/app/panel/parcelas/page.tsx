"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map as MapaIcono, MapPinned, Pencil, Plus, Power, RotateCcw, Tag } from "lucide-react";
import { Badge } from "@/components/badge";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import { Advertencia } from "@/components/estado/advertencia";
import { EstadoDeParcela } from "@/components/estado/estado-parcela";
import { LeyendaMapa } from "@/components/map/leyenda-mapa";
import type { EnfoqueMapa } from "@/components/map/parcelas-mapa";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useResumenesParcelas } from "@/lib/cargar-resumen";
import type { EstadoIndicador } from "@/lib/estado";
import { calcularCampanaVigentePorParcela, type CampanaVigente } from "@/lib/parcelas";
import type { Campana, Cultivo, Parcela } from "@/lib/types";
import { PanelFlotanteParcela } from "./panel-flotante-parcela";
import { ParcelaForm } from "./parcela-form";
import { ParcelasLista } from "./parcelas-lista";

const ParcelasMapa = dynamic(
  () => import("@/components/map/parcelas-mapa").then((m) => m.ParcelasMapa),
  { ssr: false, loading: () => <p className="p-4 text-sm text-stone-600">Cargando mapa...</p> },
);

export default function ParcelasPage() {
  const { usuario } = useAuth();
  const puedeEditar = usuario?.rol === "JEFE";

  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [campanaVigentePorParcela, setCampanaVigentePorParcela] = useState<
    Record<string, CampanaVigente>
  >({});
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [resaltadaId, setResaltadaId] = useState<string | null>(null);
  const [enfoque, setEnfoque] = useState<EnfoqueMapa | null>(null);
  // Cambia cuando una parcela se activa, desactiva o edita: se recalculan los estados.
  const [versionEstados, setVersionEstados] = useState(0);
  const { datos: resumenes, error: errorEstados } = useResumenesParcelas(versionEstados);
  const estadoListo = resumenes !== null || errorEstados !== null;
  const resumenPorParcela = useMemo(
    () => new Map((resumenes ?? []).map((r) => [r.parcelaId, r])),
    [resumenes],
  );
  const estadoPorParcela = useMemo(() => {
    const estados: Record<string, EstadoIndicador> = {};
    resumenPorParcela.forEach((resumen, id) => {
      estados[id] = resumen.estado;
    });
    return estados;
  }, [resumenPorParcela]);
  const mapaRef = useRef<HTMLDivElement>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<Parcela | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const cargar = useCallback(() => {
    setCargando(true);
    Promise.all([
      api.get<Parcela[]>("/parcelas"),
      api.get<Campana[]>("/campanas"),
      api.get<Cultivo[]>("/cultivos"),
    ])
      .then(([parcelasRes, campanasRes, cultivosRes]) => {
        setParcelas(parcelasRes.data);
        setCampanaVigentePorParcela(
          calcularCampanaVigentePorParcela(campanasRes.data, cultivosRes.data),
        );
      })
      .catch((err) => setError(apiErrorMessage(err, "No se pudieron cargar las parcelas")))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    // cargar() fija setCargando(true) de forma sincrona antes del fetch;
    // es el patron estandar de "fetch on mount" y no afecta la hidratacion.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  function recargarTodo() {
    cargar();
    setVersionEstados((v) => v + 1);
  }

  async function toggleActiva(parcela: Parcela) {
    try {
      if (parcela.activa) {
        await api.delete(`/parcelas/${parcela.id}`);
      } else {
        await api.patch(`/parcelas/${parcela.id}`, { activa: true });
      }
      recargarTodo();
    } catch (err) {
      alert(apiErrorMessage(err, "No se pudo actualizar la parcela"));
    }
  }

  async function togglePreventa(parcela: Parcela) {
    try {
      await api.patch(`/parcelas/${parcela.id}`, {
        disponibleParaPreventa: !parcela.disponibleParaPreventa,
      });
      cargar();
    } catch (err) {
      alert(apiErrorMessage(err, "No se pudo actualizar la preventa"));
    }
  }

  // Clic en una card: selecciona (abre el panel), centra el mapa y (en celular, donde
  // la lista queda debajo) sube hasta el mapa para que se vea el cambio.
  function seleccionarDesdeLista(parcela: Parcela) {
    setSeleccionadaId(parcela.id);
    if (parcela.activa && parcela.poligono) {
      setEnfoque({ poligono: parcela.poligono });
      if (window.matchMedia("(max-width: 1023px)").matches) {
        mapaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  const parcelaElegida = parcelas.find((p) => p.id === seleccionadaId && p.activa) ?? null;
  const cerrarPanel = useCallback(() => setSeleccionadaId(null), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <EncabezadoPagina
          icono={MapPinned}
          titulo="Parcelas"
          descripcion={
            puedeEditar
              ? "Gestiona las parcelas y su disponibilidad para preventa"
              : "Listado de parcelas"
          }
        />
        {puedeEditar && (
          <button
            onClick={() => setMostrarForm(true)}
            title="Registrar una parcela nueva y dibujar su polígono en el mapa"
            className="inline-flex shrink-0 items-center whitespace-nowrap gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nueva parcela
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!cargando && parcelas.some((p) => p.poligono) && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
              <MapaIcono className="h-5 w-5 text-emerald-700" aria-hidden />
              Mapa de parcelas
            </h2>
            <p className="text-base text-stone-700">
              Toca una parcela en el mapa o en la lista para ver su resumen.
            </p>
          </div>

          {errorEstados && (
            <Advertencia tipo="ATENCION" titulo="No pudimos revisar el estado de las parcelas" rol="alert">
              Por ahora se muestran como “Sin datos”. {errorEstados}
            </Advertencia>
          )}

          <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
            <ParcelasLista
              parcelas={parcelas}
              campanaVigentePorParcela={campanaVigentePorParcela}
              estadoPorParcela={estadoPorParcela}
              estadoListo={estadoListo}
              seleccionadaId={seleccionadaId}
              resaltadaId={resaltadaId}
              onSeleccionar={seleccionarDesdeLista}
              onResaltar={setResaltadaId}
              className="order-2 lg:order-1"
            />
            {/* relative: la leyenda y el panel flotante se posicionan sobre el mapa. */}
            <div
              ref={mapaRef}
              className="relative order-1 h-[70dvh] min-h-[440px] overflow-hidden rounded-lg border border-stone-200 lg:order-2 lg:h-[calc(100dvh-13rem)] lg:min-h-[420px]"
            >
              <ParcelasMapa
                parcelas={parcelas}
                estadoPorParcela={estadoPorParcela}
                seleccionadaId={seleccionadaId}
                resaltadaId={resaltadaId}
                enfoque={enfoque}
                onSeleccionar={setSeleccionadaId}
                onResaltar={setResaltadaId}
              />
              <LeyendaMapa />
              {parcelaElegida && (
                <PanelFlotanteParcela
                  parcela={parcelaElegida}
                  cultivo={campanaVigentePorParcela[parcelaElegida.id]?.cultivo ?? null}
                  resumen={resumenPorParcela.get(parcelaElegida.id) ?? null}
                  estadoListo={estadoListo}
                  onCerrar={cerrarPanel}
                />
              )}
            </div>
          </div>
        </section>
      )}
      {cargando ? (
        <p className="text-stone-500">Cargando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Hectáreas</th>
                <th className="px-4 py-3 font-medium">Ubicación</th>
                <th className="px-4 py-3 font-medium">Preventa</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {parcelas.map((parcela) => (
                <tr key={parcela.id} className={!parcela.activa ? "opacity-50" : ""}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/panel/parcelas/${parcela.id}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {parcela.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{parcela.hectareas} ha</td>
                  <td className="px-4 py-3 text-stone-600">{parcela.ubicacionTexto}</td>
                  <td className="px-4 py-3">
                    {puedeEditar ? (
                      <button
                        onClick={() => togglePreventa(parcela)}
                        title={
                          parcela.disponibleParaPreventa
                            ? "Visible para compradores. Clic para ocultarla de la preventa"
                            : "No visible para compradores. Clic para publicarla en la preventa"
                        }
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                          parcela.disponibleParaPreventa
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        <Tag className="h-3.5 w-3.5" aria-hidden />
                        {parcela.disponibleParaPreventa ? "Sí" : "No"}
                      </button>
                    ) : parcela.disponibleParaPreventa ? (
                      <Badge tono="verde" icono={Tag} ayuda="Visible para compradores en la preventa">
                        Sí
                      </Badge>
                    ) : (
                      <Badge tono="gris" icono={Tag} ayuda="No visible para compradores">
                        No
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoDeParcela
                      activa={parcela.activa}
                      estado={estadoPorParcela[parcela.id]}
                      listo={estadoListo}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {puedeEditar && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditando(parcela)}
                          title="Editar datos y polígono de la parcela"
                          className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                          Editar
                        </button>
                        <button
                          onClick={() => toggleActiva(parcela)}
                          title={
                            parcela.activa
                              ? "Desactivar: deja de aparecer en el mapa y la preventa (no se borra)"
                              : "Volver a activar la parcela"
                          }
                          className={`inline-flex items-center gap-1 text-sm ${
                            parcela.activa
                              ? "text-red-600 hover:text-red-800"
                              : "text-emerald-700 hover:text-emerald-900"
                          }`}
                        >
                          {parcela.activa ? (
                            <Power className="h-4 w-4" aria-hidden />
                          ) : (
                            <RotateCcw className="h-4 w-4" aria-hidden />
                          )}
                          {parcela.activa ? "Desactivar" : "Reactivar"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mostrarForm && (
        <ParcelaForm
          parcela={null}
          onClose={() => setMostrarForm(false)}
          onSaved={() => {
            setMostrarForm(false);
            recargarTodo();
          }}
        />
      )}
      {editando && (
        <ParcelaForm
          parcela={editando}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            recargarTodo();
          }}
        />
      )}
    </div>
  );
}
