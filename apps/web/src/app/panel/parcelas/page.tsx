"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPinned, Plus } from "lucide-react";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import { Advertencia } from "@/components/estado/advertencia";
import { EstadoVacio } from "@/components/estado/estado-vacio";
import { LeyendaMapa } from "@/components/map/leyenda-mapa";
import type { EnfoqueMapa } from "@/components/map/parcelas-mapa";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useResumenesParcelas } from "@/lib/cargar-resumen";
import type { EstadoIndicador } from "@/lib/estado";
import { useIdsDemo } from "@/lib/prediccion";
import { calcularCampanaVigentePorParcela, type CampanaVigente } from "@/lib/parcelas";
import type { Campana, Cultivo, Parcela } from "@/lib/types";
import { PanelFlotanteParcela } from "./panel-flotante-parcela";
import { ParcelaForm } from "./parcela-form";
import { ParcelasLista } from "./parcelas-lista";

const ParcelasMapa = dynamic(
  () => import("@/components/map/parcelas-mapa").then((m) => m.ParcelasMapa),
  { ssr: false, loading: () => <p className="p-4 text-sm text-tinta-suave">Cargando mapa...</p> },
);

export default function ParcelasPage() {
  const { usuario } = useAuth();
  const puedeEditar = usuario?.rol === "JEFE";

  const [todasLasParcelas, setParcelas] = useState<Parcela[]>([]);
  // Datos de demostracion (enmascarados): filtrados fuera si existieran en la BD.
  const idsDemo = useIdsDemo();
  const parcelas = useMemo(
    () => todasLasParcelas.filter((p) => idsDemo !== null && !idsDemo.has(p.id)),
    [todasLasParcelas, idsDemo],
  );
  const [campanaVigentePorParcela, setCampanaVigentePorParcela] = useState<
    Record<string, CampanaVigente>
  >({});
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [resaltadaId, setResaltadaId] = useState<string | null>(null);
  const [enfoque, setEnfoque] = useState<EnfoqueMapa | null>(null);
  // Cambia cuando una parcela se activa, desactiva o edita: se recalculan los estados.
  const [versionEstados, setVersionEstados] = useState(0);
  const { datos: resumenes, error: errorEstados } = useResumenesParcelas(
    versionEstados,
  );
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
          <Button icono={Plus} onClick={() => setMostrarForm(true)} title="Registrar una parcela nueva y dibujar su polígono en el mapa">
            Nueva parcela
          </Button>
        )}
      </div>

      {error && (
        <Advertencia tipo="CRITICO" titulo="No se pudieron cargar las parcelas" rol="alert">
          {error}
        </Advertencia>
      )}
      {errorEstados && (
        <Advertencia tipo="ATENCION" titulo="No pudimos revisar el estado de las parcelas" rol="alert">
          Por ahora se muestran como “Sin datos”. {errorEstados}
        </Advertencia>
      )}

      {cargando ? (
        <p className="text-tinta-suave">Cargando parcelas...</p>
      ) : parcelas.length === 0 ? (
        <EstadoVacio titulo="Todavía no hay parcelas">
          <p>{puedeEditar ? "Crea la primera con “Nueva parcela”." : "El jefe todavía no registró parcelas."}</p>
        </EstadoVacio>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(22rem,26rem)_minmax(0,1fr)]">
          <Card className="order-2 overflow-hidden lg:order-1">
            <div className="flex items-baseline justify-between gap-2 border-b border-borde px-5 py-4">
              <h2 className="text-lg font-semibold text-tinta">Lista de parcelas</h2>
              <p className="text-sm text-tinta-suave">{parcelas.filter((p) => p.activa).length} activas</p>
            </div>
            <ParcelasLista
              parcelas={parcelas}
              campanaVigentePorParcela={campanaVigentePorParcela}
              estadoPorParcela={estadoPorParcela}
              estadoListo={estadoListo}
              seleccionadaId={seleccionadaId}
              resaltadaId={resaltadaId}
              onSeleccionar={seleccionarDesdeLista}
              onResaltar={setResaltadaId}
              acciones={
                puedeEditar
                  ? { editar: setEditando, cambiarPreventa: togglePreventa, cambiarActiva: toggleActiva }
                  : null
              }
            />
          </Card>

          {parcelas.some((p) => p.activa && p.poligono) ? (
            /* relative: la leyenda y el panel flotante se posicionan sobre el mapa. */
            <div
              ref={mapaRef}
              className="relative order-1 h-[70dvh] min-h-[440px] overflow-hidden rounded-tarjeta border border-borde shadow-tarjeta lg:order-2 lg:h-[calc(100dvh-10rem)]"
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
          ) : (
            <div className="order-1 lg:order-2">
              <EstadoVacio titulo="Mapa: sin datos">
                <p>Ninguna parcela activa tiene su polígono dibujado. Edita una parcela para dibujarlo.</p>
              </EstadoVacio>
            </div>
          )}
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
