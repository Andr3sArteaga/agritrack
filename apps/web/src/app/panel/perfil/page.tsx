"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import { Advertencia } from "@/components/estado/advertencia";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CLASE_CAMPO } from "@/components/ui/field";
import { Tag } from "@/components/ui/tag";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ROL_LABEL, type Usuario } from "@/lib/types";

export default function MiPerfilPage() {
  const { usuario, actualizarUsuario } = useAuth();
  const [perfil, setPerfil] = useState<Usuario | null>(usuario);
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [apellido, setApellido] = useState(usuario?.apellido ?? "");
  const [telefono, setTelefono] = useState(usuario?.telefono ?? "");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardadoExito, setGuardadoExito] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    api
      .get<Usuario>("/auth/perfil")
      .then((res) => {
        if (cancelado) return;
        setPerfil(res.data);
        setNombre(res.data.nombre);
        setApellido(res.data.apellido ?? "");
        setTelefono(res.data.telefono ?? "");
      })
      .catch((err) => {
        if (!cancelado) {
          setError(apiErrorMessage(err, "No se pudo cargar tu perfil"));
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
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardadoExito(null);
    setGuardando(true);

    try {
      const { data } = await api.patch<Usuario>("/auth/perfil", {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telefono.trim(),
      });
      setPerfil(data);
      actualizarUsuario(data);
      setGuardadoExito("Tus datos personales se actualizaron correctamente.");
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudieron guardar los cambios"));
    } finally {
      setGuardando(false);
    }
  }

  const rolActual = perfil?.rol ?? usuario?.rol;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <EncabezadoPagina
        icono={UserRound}
        titulo="Mi Perfil"
        descripcion="Consulta tu rol actual y mantén actualizados tus datos de contacto"
      />

      {error && (
        <Advertencia tipo="CRITICO" titulo="Error" rol="alert">
          {error}
        </Advertencia>
      )}

      {guardadoExito && (
        <Advertencia tipo="BIEN" titulo="Listo" rol="status">
          {guardadoExito}
        </Advertencia>
      )}

      {cargando && !perfil ? (
        <p className="text-tinta-suave">Cargando perfil...</p>
      ) : (
        <Card className="p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-borde pb-5">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-marca-suave text-marca">
                <UserRound className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h2 className="text-lg font-bold text-tinta">
                  {perfil?.nombre ?? usuario?.nombre}{" "}
                  {perfil?.apellido ?? usuario?.apellido ?? ""}
                </h2>
                <p className="flex items-center gap-1.5 break-all text-sm text-tinta-suave">
                  <Mail className="h-3.5 w-3.5 text-marca" aria-hidden />
                  {perfil?.email ?? usuario?.email}
                </p>
              </div>
            </div>

            {rolActual && (
              <Tag tono="marca" icono={ShieldCheck}>
                Rol actual: {ROL_LABEL[rolActual]}
              </Tag>
            )}
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="perfil-nombre" className="block text-sm font-semibold text-tinta">
                  Nombre
                </label>
                <input
                  id="perfil-nombre"
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={`${CLASE_CAMPO} mt-1.5`}
                />
              </div>

              <div>
                <label htmlFor="perfil-apellido" className="block text-sm font-semibold text-tinta">
                  Apellido
                </label>
                <input
                  id="perfil-apellido"
                  type="text"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  placeholder="Sin registrar"
                  className={`${CLASE_CAMPO} mt-1.5`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="perfil-email" className="block text-sm font-semibold text-tinta">
                  Correo electrónico
                </label>
                <input
                  id="perfil-email"
                  type="email"
                  disabled
                  value={perfil?.email ?? usuario?.email ?? ""}
                  className={`${CLASE_CAMPO} mt-1.5 disabled:cursor-not-allowed disabled:bg-fondo disabled:text-tinta-suave`}
                />
              </div>

              <div>
                <label htmlFor="perfil-telefono" className="block text-sm font-semibold text-tinta">
                  Número de teléfono
                </label>
                <div className="relative mt-1.5">
                  <Phone
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-tinta-suave"
                    aria-hidden
                  />
                  <input
                    id="perfil-telefono"
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+591 70000000"
                    className={`${CLASE_CAMPO} pl-10`}
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="perfil-rol" className="block text-sm font-semibold text-tinta">
                Rol actual
              </label>
              <input
                id="perfil-rol"
                type="text"
                disabled
                value={rolActual ? ROL_LABEL[rolActual] : ""}
                className={`${CLASE_CAMPO} mt-1.5 disabled:cursor-not-allowed disabled:bg-fondo disabled:text-tinta-suave`}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
