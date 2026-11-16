"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import { Advertencia } from "@/components/estado/advertencia";
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
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-[#00a859]/30 bg-[#E8F5EF] p-4 text-sm text-[#004b36]"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#00a859]" aria-hidden />
          <p className="font-medium">{guardadoExito}</p>
        </div>
      )}

      {cargando && !perfil ? (
        <div className="rounded-2xl border border-[#E4EAE6] bg-white p-8 text-center text-sm text-[#68736D]">
          Cargando perfil...
        </div>
      ) : (
        <div className="rounded-3xl border border-[#E4EAE6] bg-white p-6 shadow-xs sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4EAE6] pb-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F5EF] text-[#006B4F]">
                <UserRound className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#17211D]">
                  {perfil?.nombre ?? usuario?.nombre}{" "}
                  {perfil?.apellido ?? usuario?.apellido ?? ""}
                </h2>
                <p className="flex items-center gap-1.5 text-sm text-[#68736D]">
                  <Mail className="h-3.5 w-3.5 text-[#006B4F]" aria-hidden />
                  {perfil?.email ?? usuario?.email}
                </p>
              </div>
            </div>

            {rolActual && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5EF] px-3.5 py-1.5 text-xs font-bold text-[#006B4F]">
                <ShieldCheck className="h-4 w-4 text-[#00a859]" aria-hidden />
                Rol actual: {ROL_LABEL[rolActual]}
              </span>
            )}
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="perfil-nombre" className="block text-sm font-semibold text-[#17211D]">
                  Nombre
                </label>
                <input
                  id="perfil-nombre"
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="mt-1.5 min-h-11 w-full rounded-2xl border border-[#E4EAE6] bg-[#f8faf9] px-4 text-base text-[#17211D] transition-colors focus:border-[#006B4F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006B4F]/20"
                />
              </div>

              <div>
                <label htmlFor="perfil-apellido" className="block text-sm font-semibold text-[#17211D]">
                  Apellido
                </label>
                <input
                  id="perfil-apellido"
                  type="text"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  placeholder="Sin registrar"
                  className="mt-1.5 min-h-11 w-full rounded-2xl border border-[#E4EAE6] bg-[#f8faf9] px-4 text-base text-[#17211D] transition-colors focus:border-[#006B4F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006B4F]/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="perfil-email" className="block text-sm font-semibold text-[#17211D]">
                  Correo electrónico
                </label>
                <input
                  id="perfil-email"
                  type="email"
                  disabled
                  value={perfil?.email ?? usuario?.email ?? ""}
                  className="mt-1.5 min-h-11 w-full cursor-not-allowed rounded-2xl border border-[#E4EAE6] bg-stone-100 px-4 text-base text-[#68736D]"
                />
              </div>

              <div>
                <label htmlFor="perfil-telefono" className="block text-sm font-semibold text-[#17211D]">
                  Número de teléfono
                </label>
                <div className="relative mt-1.5">
                  <Phone
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#68736D]"
                    aria-hidden
                  />
                  <input
                    id="perfil-telefono"
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+591 70000000"
                    className="min-h-11 w-full rounded-2xl border border-[#E4EAE6] bg-[#f8faf9] pl-10 pr-4 text-base text-[#17211D] transition-colors focus:border-[#006B4F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006B4F]/20"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="perfil-rol" className="block text-sm font-semibold text-[#17211D]">
                Rol actual
              </label>
              <input
                id="perfil-rol"
                type="text"
                disabled
                value={rolActual ? ROL_LABEL[rolActual] : ""}
                className="mt-1.5 min-h-11 w-full cursor-not-allowed rounded-2xl border border-[#E4EAE6] bg-stone-100 px-4 text-base text-[#68736D]"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={guardando}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#004b36] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#00a859] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
