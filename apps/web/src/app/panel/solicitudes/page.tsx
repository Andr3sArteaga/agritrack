"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Mail, Phone, UserCheck, XCircle } from "lucide-react";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import { Advertencia } from "@/components/estado/advertencia";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CLASE_CAMPO } from "@/components/ui/field";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ROL_LABEL, type Rol, type Usuario } from "@/lib/types";

interface AprobarResponse {
  usuario: Usuario;
  correoEnviado: boolean;
  detalleCorreo: string;
}

const ROLES_DISPONIBLES: Rol[] = ["OPERATIVO", "CONTABILIDAD", "JEFE"];

export default function SolicitudesAccesoPage() {
  const { usuario } = useAuth();
  const esJefe = usuario?.rol === "JEFE";

  const [solicitudes, setSolicitudes] = useState<Usuario[]>([]);
  const [rolesSeleccionados, setRolesSeleccionados] = useState<Record<string, Rol>>({});
  const [cargando, setCargando] = useState(esJefe);
  const [error, setError] = useState<string | null>(null);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [accionActiva, setAccionActiva] = useState<"aprobar" | "rechazar" | null>(null);
  const [avisoAccion, setAvisoAccion] = useState<string | null>(null);

  useEffect(() => {
    if (!esJefe) return;
    let cancelado = false;
    api
      .get<Usuario[]>("/auth/solicitudes")
      .then((res) => {
        if (cancelado) return;
        setSolicitudes(res.data);
        const iniciales: Record<string, Rol> = {};
        for (const item of res.data) {
          iniciales[item.id] = "OPERATIVO";
        }
        setRolesSeleccionados(iniciales);
      })
      .catch((err) => {
        if (!cancelado) {
          setError(apiErrorMessage(err, "No se pudieron cargar las solicitudes de acceso"));
        }
      })
      .finally(() => {
        if (!cancelado) {
          setCargando(false);
        }
      });
    return () => {
      cancelado = true;
    };
  }, [esJefe]);

  async function aprobar(solicitante: Usuario) {
    const rolElegido = rolesSeleccionados[solicitante.id] ?? "OPERATIVO";
    setError(null);
    setAvisoAccion(null);
    setOcupadoId(solicitante.id);
    setAccionActiva("aprobar");

    try {
      const { data } = await api.patch<AprobarResponse>(
        `/auth/solicitudes/${solicitante.id}/aprobar`,
        { rol: rolElegido },
      );
      setSolicitudes((prev) => prev.filter((item) => item.id !== solicitante.id));
      const nombreCompleto = [data.usuario.nombre, data.usuario.apellido]
        .filter(Boolean)
        .join(" ");
      setAvisoAccion(
        `${nombreCompleto} fue aprobado con el rol ${ROL_LABEL[data.usuario.rol]}. ${data.detalleCorreo}`,
      );
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo aprobar la solicitud"));
    } finally {
      setOcupadoId(null);
      setAccionActiva(null);
    }
  }

  async function rechazar(solicitante: Usuario) {
    setError(null);
    setAvisoAccion(null);
    setOcupadoId(solicitante.id);
    setAccionActiva("rechazar");

    try {
      await api.patch(`/auth/solicitudes/${solicitante.id}/rechazar`);
      setSolicitudes((prev) => prev.filter((item) => item.id !== solicitante.id));
      const nombreCompleto = [solicitante.nombre, solicitante.apellido]
        .filter(Boolean)
        .join(" ");
      setAvisoAccion(`Se rechazó y eliminó la solicitud de ${nombreCompleto} (${solicitante.email}).`);
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo rechazar la solicitud"));
    } finally {
      setOcupadoId(null);
      setAccionActiva(null);
    }
  }

  if (!esJefe) {
    return (
      <div className="space-y-6">
        <EncabezadoPagina
          icono={UserCheck}
          titulo="Solicitudes de acceso"
          descripcion="Gestión exclusiva del Jefe"
        />
        <Advertencia tipo="ATENCION" titulo="Acceso restringido">
          Solo el usuario con rol Jefe puede revisar y aprobar solicitudes de acceso al sistema.
        </Advertencia>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        icono={UserCheck}
        titulo="Solicitudes de acceso"
        descripcion="Revisa los registros pendientes, asigna un rol y habilita el ingreso al sistema"
      />

      {avisoAccion && (
        <Advertencia tipo="BIEN" titulo="Listo" rol="status">
          {avisoAccion}
        </Advertencia>
      )}

      {error && (
        <Advertencia tipo="CRITICO" titulo="Error" rol="alert">
          {error}
        </Advertencia>
      )}

      {cargando ? (
        <p className="text-tinta-suave">Cargando solicitudes pendientes...</p>
      ) : solicitudes.length === 0 ? (
        <Card className="p-8 text-center">
          <UserCheck className="mx-auto h-9 w-9 text-marca" aria-hidden />
          <h2 className="mt-3 text-base font-bold text-tinta">
            No hay solicitudes pendientes
          </h2>
          <p className="mt-1 text-sm text-tinta-suave">
            Cuando alguien del equipo envíe una solicitud desde la pantalla de ingreso, aparecerá aquí.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {solicitudes.map((solicitante) => {
            const rolElegido = rolesSeleccionados[solicitante.id] ?? "OPERATIVO";
            const enProceso = ocupadoId === solicitante.id;
            const fecha = new Date(solicitante.createdAt).toLocaleDateString("es-BO", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });

            return (
              <Card
                key={solicitante.id}
                className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-base font-bold text-tinta">
                      {solicitante.nombre} {solicitante.apellido ?? ""}
                    </h2>
                    <span className="rounded-full border border-dotted border-pend-borde bg-pend-fondo px-2.5 py-0.5 text-xs font-semibold text-pend-texto">
                      Pendiente
                    </span>
                    <span className="text-xs text-tinta-suave">Solicitado el {fecha}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-tinta-suave">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-marca" aria-hidden />
                      {solicitante.email}
                    </span>
                    {solicitante.telefono && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-marca" aria-hidden />
                        {solicitante.telefono}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <label
                      htmlFor={`rol-${solicitante.id}`}
                      className="text-xs font-semibold uppercase tracking-wide text-tinta-suave"
                    >
                      Rol asignado
                    </label>
                    <select
                      id={`rol-${solicitante.id}`}
                      value={rolElegido}
                      disabled={enProceso}
                      onChange={(e) =>
                        setRolesSeleccionados((prev) => ({
                          ...prev,
                          [solicitante.id]: e.target.value as Rol,
                        }))
                      }
                      className={`${CLASE_CAMPO} flex-1 font-semibold sm:w-auto`}
                    >
                      {ROLES_DISPONIBLES.map((rol) => (
                        <option key={rol} value={rol}>
                          {ROL_LABEL[rol]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={enProceso}
                    onClick={() => rechazar(solicitante)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-critico-borde/40 bg-superficie px-4 text-base font-semibold text-critico-borde transition-colors hover:bg-critico-fondo disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" aria-hidden />
                    {enProceso && accionActiva === "rechazar" ? "Rechazando..." : "Rechazar"}
                  </button>

                  <Button disabled={enProceso} onClick={() => aprobar(solicitante)} icono={CheckCircle2}>
                    {enProceso && accionActiva === "aprobar" ? "Aprobando..." : "Aprobar"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
