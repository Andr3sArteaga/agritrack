"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Map as MapaIcono,
  MapPinned,
  PanelLeft,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Tag,
} from "lucide-react";
import { Badge, BadgeEstadoParcela } from "@/components/badge";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import type { EnfoqueMapa } from "@/components/map/parcelas-mapa";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { calcularCampanaVigentePorParcela, type CampanaVigente } from "@/lib/parcelas";
import type { Campana, Cultivo, Parcela } from "@/lib/types";
import { ParcelaForm } from "./parcela-form";
import { ParcelasLista } from "./parcelas-lista";

const ParcelasMapa = dynamic(
  () => import("@/components/map/parcelas-mapa").then((m) => m.ParcelasMapa),
  { ssr: false, loading: () => <p className="text-sm text-stone-500">Cargando mapa...</p> },
);

type VistaMapa = "mapa" | "mapa-lista";

// Alto casi completo de la pantalla (descuenta encabezado y controles del panel).
const ALTO_MAPA: Record<VistaMapa, string> = {
  mapa: "h-[calc(100dvh-17rem)] min-h-[420px] md:h-[calc(100dvh-13rem)]",
  "mapa-lista": "h-[55dvh] min-h-[320px] lg:h-[calc(100dvh-13rem)] lg:min-h-[420px]",
};

export default function ParcelasPage() {
  const { usuario } = useAuth();
  const puedeEditar = usuario?.rol === "JEFE";

  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [campanaVigentePorParcela, setCampanaVigentePorParcela] = useState<
    Record<string, CampanaVigente>
  >({});
  const [vista, setVista] = useState<VistaMapa>("mapa");
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [enfoque, setEnfoque] = useState<EnfoqueMapa | null>(null);
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

  async function toggleActiva(parcela: Parcela) {
    try {
      if (parcela.activa) {
        await api.delete(`/parcelas/${parcela.id}`);
      } else {
        await api.patch(`/parcelas/${parcela.id}`, { activa: true });
      }
      cargar();
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

  // Clic en una card: resalta, centra el mapa y (en celular, donde la lista queda
  // debajo) sube hasta el mapa para que se vea el cambio.
  function seleccionarDesdeLista(parcela: Parcela) {
    setSeleccionadaId(parcela.id);
    if (parcela.activa && parcela.poligono) {
      setEnfoque({ poligono: parcela.poligono });
      if (window.matchMedia("(max-width: 1023px)").matches) {
        mapaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

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
            <div
              role="group"
              aria-label="Vista del mapa"
              className="inline-flex overflow-hidden rounded-md border border-stone-300 bg-white text-sm font-medium"
            >
              <button
                type="button"
                aria-pressed={vista === "mapa"}
                title="Solo el mapa, a pantalla casi completa"
                onClick={() => setVista("mapa")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${
                  vista === "mapa" ? "bg-emerald-700 text-white" : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                <MapaIcono className="h-4 w-4" aria-hidden />
                Mapa
              </button>
              <button
                type="button"
                aria-pressed={vista === "mapa-lista"}
                title="Mapa con la lista de parcelas al lado"
                onClick={() => setVista("mapa-lista")}
                className={`inline-flex items-center gap-1.5 border-l border-stone-300 px-3 py-1.5 ${
                  vista === "mapa-lista" ? "bg-emerald-700 text-white" : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                <PanelLeft className="h-4 w-4" aria-hidden />
                Mapa + lista
              </button>
            </div>
          </div>

          {/* El mapa ocupa siempre el mismo lugar en el arbol: cambiar de vista no lo reinicia. */}
          <div className={vista === "mapa-lista" ? "grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]" : ""}>
            {vista === "mapa-lista" && (
              <ParcelasLista
                parcelas={parcelas}
                campanaVigentePorParcela={campanaVigentePorParcela}
                seleccionadaId={seleccionadaId}
                onSeleccionar={seleccionarDesdeLista}
                className="order-2 lg:order-1"
              />
            )}
            <div
              ref={mapaRef}
              className={`order-1 overflow-hidden rounded-lg border border-stone-200 lg:order-2 ${ALTO_MAPA[vista]}`}
            >
              <ParcelasMapa
                parcelas={parcelas}
                campanaVigentePorParcela={campanaVigentePorParcela}
                seleccionadaId={seleccionadaId}
                enfoque={enfoque}
                onSeleccionar={setSeleccionadaId}
              />
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
                    <BadgeEstadoParcela
                      activa={parcela.activa}
                      conCampanaVigente={!!campanaVigentePorParcela[parcela.id]}
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
            cargar();
          }}
        />
      )}
      {editando && (
        <ParcelaForm
          parcela={editando}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}
