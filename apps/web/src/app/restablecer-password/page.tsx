"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useSyncExternalStore, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Advertencia } from "@/components/estado/advertencia";
import { PantallaCuenta, TarjetaCuenta } from "@/components/publico/pantalla-cuenta";
import { api, apiErrorMessage } from "@/lib/api";
import { CLASE_CAMPO } from "@/components/ui/field";

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
    <TarjetaCuenta
      icono={LockKeyhole}
      titulo="Nueva contraseña"
      descripcion="Elige una nueva contraseña segura para tu cuenta."
    >

      {exito ? (
        <div className="mt-7 space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-marca-suave text-marca">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </div>
          <div className="space-y-2 rounded-tarjeta border border-borde bg-fondo-suave p-5 text-sm">
            <p className="font-semibold text-tinta">Contraseña actualizada</p>
            <p className="text-tinta-suave">
              Ya puedes ingresar a AgriTrack con tu nueva contraseña.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-tinta px-6 text-base font-semibold text-white transition-colors hover:bg-marca-oscuro"
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
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-tinta px-6 text-base font-semibold text-white transition-colors hover:bg-marca-oscuro"
          >
            Solicitar nuevo enlace
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="nuevaPassword" className="block text-sm font-semibold text-tinta">
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
                className={`${CLASE_CAMPO} pr-12`}
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-0.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-tinta-suave transition-colors hover:text-tinta"
              >
                {mostrarPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmacion" className="block text-sm font-semibold text-tinta">
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
              className={`${CLASE_CAMPO} mt-1.5`}
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
            className="min-h-12 w-full rounded-full bg-tinta px-6 text-base font-semibold text-white transition-colors hover:bg-marca-oscuro disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? "Guardando..." : "Guardar nueva contraseña"}
          </button>
        </form>
      )}
    </TarjetaCuenta>
  );
}

export default function RestablecerPasswordPage() {
  return (
    <PantallaCuenta>
        <Suspense
          fallback={
            <div className="w-full max-w-md rounded-[28px] border border-white/80 bg-white/65 p-8 text-center text-sm text-tinta-suave backdrop-blur-xl">
              Cargando formulario...
            </div>
          }
        >
          <RestablecerPasswordContenido />
        </Suspense>
    </PantallaCuenta>
  );
}
