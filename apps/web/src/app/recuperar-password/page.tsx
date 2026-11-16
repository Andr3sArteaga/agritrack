"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { Advertencia } from "@/components/estado/advertencia";
import { LandingNavbar } from "@/components/publico/landing-navbar";
import { api, apiErrorMessage } from "@/lib/api";

interface RecuperarResponse {
  mensaje: string;
  proveedor?: "supabase" | "resend" | "desarrollo";
  resetUrlDesarrollo?: string;
}

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RecuperarResponse | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const { data } = await api.post<RecuperarResponse>("/auth/recuperar-password", {
        email: email.trim(),
      });
      setResultado(data);
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo procesar la solicitud de recuperación"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8faf9] text-[#17211D]">
      <LandingNavbar />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-3xl border border-[#E4EAE6] bg-white p-7 shadow-xs sm:p-8">
          <div className="text-center">
            <span className="inline-block rounded-full bg-[#006B4F]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#006B4F]">
              Recuperación segura
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#17211D]">
              ¿Olvidaste tu contraseña?
            </h1>
            <p className="mt-1.5 text-sm text-[#68736D]">
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecerla.
            </p>
          </div>

          {resultado ? (
            <div className="mt-7 space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F5EF] text-[#006B4F]">
                <MailCheck className="h-7 w-7" aria-hidden />
              </div>
              <div className="space-y-2 rounded-2xl border border-[#E4EAE6] bg-[#f8faf9] p-5 text-sm">
                <p className="font-semibold text-[#17211D]">Revisa tu bandeja de entrada</p>
                <p className="text-[#68736D]">{resultado.mensaje}</p>
              </div>
              {resultado.resetUrlDesarrollo && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-xs text-amber-900">
                  <p className="font-bold">Entorno de desarrollo sin correo configurado:</p>
                  <Link
                    href={resultado.resetUrlDesarrollo.replace(/^https?:\/\/[^/]+/, "")}
                    className="mt-1 inline-block break-all font-semibold text-[#006B4F] underline"
                  >
                    Abrir enlace de restablecimiento de prueba →
                  </Link>
                </div>
              )}
              <Link
                href="/login"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#004b36] px-6 text-base font-semibold text-white transition-colors hover:bg-[#00a859]"
              >
                Volver a iniciar sesión
              </Link>
            </div>
          ) : (
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
                  placeholder="tu-correo@agroan.com"
                  className="mt-1.5 min-h-11 w-full rounded-2xl border border-[#E4EAE6] bg-[#f8faf9] px-4 text-base text-[#17211D] transition-colors focus:border-[#006B4F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006B4F]/20"
                />
              </div>

              {error && (
                <Advertencia tipo="CRITICO" titulo="Error al enviar solicitud" rol="alert">
                  {error}
                </Advertencia>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="min-h-12 w-full rounded-full bg-[#004b36] px-6 text-base font-semibold text-white transition-colors hover:bg-[#00a859] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviando ? "Enviando enlace..." : "Enviar enlace de recuperación"}
              </button>

              <p className="text-center text-sm text-[#68736D]">
                <Link href="/login" className="font-semibold text-[#006B4F] hover:underline">
                  Volver a iniciar sesión
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
