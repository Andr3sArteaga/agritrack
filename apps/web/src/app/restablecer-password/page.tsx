"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useSyncExternalStore, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Advertencia } from "@/components/estado/advertencia";
import { LandingNavbar } from "@/components/publico/landing-navbar";
import { api, apiErrorMessage } from "@/lib/api";

const suscribirVacio = () => () => {};

function RestablecerPasswordContenido() {
  const searchParams = useSearchParams();
  const hash = useSyncExternalStore(
    suscribirVacio,
    () => window.location.hash,
    () => "",
  );
  const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const token =
    hashParams.get("access_token") ??
    searchParams.get("token") ??
    searchParams.get("access_token") ??
    "";

  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("El enlace de recuperación no incluye un token válido.");
      return;
    }
    if (nuevaPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (nuevaPassword !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setGuardando(true);
    try {
      await api.post("/auth/restablecer-password", {
        token,
        nuevaPassword,
      });
      setExito(true);
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo restablecer la contraseña"));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-[#E4EAE6] bg-white p-7 shadow-xs sm:p-8">
      <div className="text-center">
        <span className="inline-block rounded-full bg-[#006B4F]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#006B4F]">
          Seguridad
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#17211D]">
          Nueva contraseña
        </h1>
        <p className="mt-1.5 text-sm text-[#68736D]">
          Elige una nueva contraseña segura para tu cuenta.
        </p>
      </div>

      {exito ? (
        <div className="mt-7 space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F5EF] text-[#006B4F]">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </div>
          <div className="space-y-2 rounded-2xl border border-[#E4EAE6] bg-[#f8faf9] p-5 text-sm">
            <p className="font-semibold text-[#17211D]">Contraseña actualizada</p>
            <p className="text-[#68736D]">
              Ya puedes ingresar a AgriTrack con tu nueva contraseña.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#004b36] px-6 text-base font-semibold text-white transition-colors hover:bg-[#00a859]"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      ) : !token ? (
        <div className="mt-7 space-y-5">
          <Advertencia tipo="ATENCION" titulo="Enlace incompleto o expirado">
            Este enlace no contiene un token de recuperación válido. Solicita uno nuevo desde la pantalla de recuperación.
          </Advertencia>
          <Link
            href="/recuperar-password"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#004b36] px-6 text-base font-semibold text-white transition-colors hover:bg-[#00a859]"
          >
            Solicitar nuevo enlace
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="nuevaPassword" className="block text-sm font-semibold text-[#17211D]">
              Nueva contraseña
            </label>
            <div className="relative mt-1.5">
              <input
                id="nuevaPassword"
                type={mostrarPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={6}
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="min-h-11 w-full rounded-2xl border border-[#E4EAE6] bg-[#f8faf9] px-4 pr-12 text-base text-[#17211D] transition-colors focus:border-[#006B4F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006B4F]/20"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[#68736D] transition-colors hover:text-[#17211D]"
              >
                {mostrarPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmacion" className="block text-sm font-semibold text-[#17211D]">
              Confirmar contraseña
            </label>
            <input
              id="confirmacion"
              type={mostrarPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-2xl border border-[#E4EAE6] bg-[#f8faf9] px-4 text-base text-[#17211D] transition-colors focus:border-[#006B4F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006B4F]/20"
            />
          </div>

          {error && (
            <Advertencia tipo="CRITICO" titulo="No se pudo cambiar la contraseña" rol="alert">
              {error}
            </Advertencia>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="min-h-12 w-full rounded-full bg-[#004b36] px-6 text-base font-semibold text-white transition-colors hover:bg-[#00a859] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? "Guardando..." : "Guardar nueva contraseña"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function RestablecerPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8faf9] text-[#17211D]">
      <LandingNavbar />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <Suspense
          fallback={
            <div className="w-full max-w-md rounded-3xl border border-[#E4EAE6] bg-white p-8 text-center text-sm text-[#68736D]">
              Cargando formulario...
            </div>
          }
        >
          <RestablecerPasswordContenido />
        </Suspense>
      </main>
    </div>
  );
}
