"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Advertencia } from "@/components/estado/advertencia";
import { PantallaCuenta, TarjetaCuenta } from "@/components/publico/pantalla-cuenta";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff, LogIn } from "lucide-react";
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
    <PantallaCuenta>
        <TarjetaCuenta
          icono={LogIn}
          titulo="Ingresar a AgriTrack"
          descripcion="Entra con tu cuenta de AgroAn."
        >

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
              className="min-h-12 w-full rounded-full bg-tinta px-6 text-base font-semibold text-white transition-colors hover:bg-marca-oscuro disabled:cursor-not-allowed disabled:opacity-60"
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
              className="flex min-h-11 w-full items-center justify-center rounded-full border border-borde bg-superficie/80 px-5 text-sm font-semibold text-tinta transition-colors hover:border-tinta hover:bg-superficie"
            >
              Ver parcelas disponibles
            </Link>
            <p className="mt-2.5 text-center text-xs text-tinta-suave">
              No necesitas cuenta para verlas.
            </p>
          </div>
        </TarjetaCuenta>
    </PantallaCuenta>
  );
}
