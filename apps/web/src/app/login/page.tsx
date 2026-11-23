"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Advertencia } from "@/components/estado/advertencia";
import { LandingNavbar } from "@/components/publico/landing-navbar";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff } from "lucide-react";
import { CLASE_CAMPO } from "@/components/ui/field";

export default function LoginPage() {
  const { login, usuario } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Navegar durante el render rompe React; el efecto cubre tanto la sesion
  // ya iniciada como el login recien hecho (redirige segun el rol).
  useEffect(() => {
    if (usuario) {
      router.replace(usuario.rol === "OPERATIVO" ? "/panel/parcelas" : "/panel/dashboard");
    }
  }, [usuario, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesion");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-fondo-suave text-tinta">
      <LandingNavbar />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-tarjeta border border-borde bg-superficie p-7 shadow-tarjeta sm:p-8">
          <div className="text-center">
            <span className="inline-block rounded-full bg-marca/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-marca">
              Portal AgroAn
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-tinta">
              Ingresar a AgriTrack
            </h1>
            <p className="mt-1.5 text-sm text-tinta-suave">Entra con tu cuenta de AgroAn.</p>
          </div>

          <form onSubmit={onSubmit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-tinta">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${CLASE_CAMPO} mt-1.5`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="password" className="block text-sm font-semibold text-tinta">
                  Contraseña
                </label>
                <Link
                  href="/recuperar-password"
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-marca hover:text-marca-hover hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  type={mostrarPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            {error && (
              <Advertencia tipo="CRITICO" titulo="No se pudo ingresar" rol="alert">
                {error}
              </Advertencia>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="min-h-12 w-full rounded-full bg-marca-oscuro px-6 text-base font-semibold text-white transition-colors hover:bg-marca-noche disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-tinta-suave">
              ¿Eres parte del equipo? Si no tienes cuenta,
            </p>
            <Link href="/solicitar-acceso" className="inline-flex min-h-11 items-center text-sm font-semibold text-marca hover:text-marca-hover hover:underline">
              haz clic aquí
            </Link>
          </div>

          <div className="mt-6 border-t border-borde pt-6">
            <Link
              href="/parcelas"
              className="flex min-h-11 w-full items-center justify-center rounded-full border border-borde bg-fondo-suave px-5 text-sm font-semibold text-marca-oscuro transition-colors hover:border-marca hover:bg-superficie"
            >
              Ver parcelas disponibles
            </Link>
            <p className="mt-2.5 text-center text-xs text-tinta-suave">
              No necesitas cuenta para verlas.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
