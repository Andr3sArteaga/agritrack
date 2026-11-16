"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Advertencia } from "@/components/estado/advertencia";
import { LandingNavbar } from "@/components/publico/landing-navbar";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff } from "lucide-react";

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
    <div className="flex min-h-screen flex-col bg-[#f8faf9] text-[#17211D]">
      <LandingNavbar />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-3xl border border-[#E4EAE6] bg-white p-7 shadow-xs sm:p-8">
          <div className="text-center">
            <span className="inline-block rounded-full bg-[#006B4F]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#006B4F]">
              Portal AgroAn
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#17211D]">
              Ingresar a AgriTrack
            </h1>
            <p className="mt-1.5 text-sm text-[#68736D]">Entra con tu cuenta de AgroAn.</p>
          </div>

          <form onSubmit={onSubmit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[#17211D]">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-2xl border border-[#E4EAE6] bg-[#f8faf9] px-4 text-base text-[#17211D] transition-colors focus:border-[#006B4F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006B4F]/20"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="password" className="block text-sm font-semibold text-[#17211D]">
                  Contraseña
                </label>
                <Link
                  href="/recuperar-password"
                  className="text-xs font-semibold text-[#006B4F] hover:text-[#00a859] hover:underline"
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

            {error && (
              <Advertencia tipo="CRITICO" titulo="No se pudo ingresar" rol="alert">
                {error}
              </Advertencia>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="min-h-12 w-full rounded-full bg-[#004b36] px-6 text-base font-semibold text-white transition-colors hover:bg-[#00a859] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-[#68736D]">
              ¿Eres parte del equipo? Si no tienes cuenta, haz clic aquí
            </p>
            <Link href="/solicitar-acceso" className="text-sm font-semibold text-[#006B4F] hover:text-[#00a859] hover:underline">
              haz clic aquí
            </Link>
          </div>

          <div className="mt-6 border-t border-[#E4EAE6] pt-6">
            <Link
              href="/parcelas"
              className="flex min-h-11 w-full items-center justify-center rounded-full border border-[#E4EAE6] bg-[#f8faf9] px-5 text-sm font-semibold text-[#004b36] transition-colors hover:border-[#006B4F] hover:bg-white"
            >
              Ver parcelas disponibles
            </Link>
            <p className="mt-2.5 text-center text-xs text-[#68736D]">
              No necesitas cuenta para verlas.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
