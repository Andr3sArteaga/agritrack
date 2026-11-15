"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Advertencia } from "@/components/estado/advertencia";
import { EnlaceBoton } from "@/components/enlace-boton";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login, usuario } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

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
    <div className="flex flex-1 flex-col items-center justify-center bg-stone-50 px-4 py-12 sm:px-6">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Link href="/" className="text-3xl font-bold text-emerald-700">
            AgriTrack
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-stone-900">Ingresar</h1>
          <p className="mt-1 text-base text-stone-700">Entra con tu cuenta de AgroAn.</p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="block text-base font-bold text-stone-800">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border-2 border-stone-400 px-3 text-base focus:border-emerald-700"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-base font-bold text-stone-800">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border-2 border-stone-400 px-3 text-base focus:border-emerald-700"
            />
          </div>

          {error && (
            <Advertencia tipo="CRITICO" titulo="No se pudo ingresar" rol="alert">
              {error}
            </Advertencia>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="min-h-12 w-full rounded-md border-2 border-emerald-700 bg-emerald-700 px-4 text-base font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="mt-6">
          <EnlaceBoton href="/parcelas" variante="secundario" completo>
            Ver parcelas disponibles
          </EnlaceBoton>
          <p className="mt-2 text-center text-sm text-stone-600">No necesitas cuenta para verlas.</p>
        </div>
      </div>
    </div>
  );
}
