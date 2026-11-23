"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { KeyRound, MailCheck } from "lucide-react";
import { Advertencia } from "@/components/estado/advertencia";
import { PantallaCuenta, TarjetaCuenta } from "@/components/publico/pantalla-cuenta";
import { api, apiErrorMessage } from "@/lib/api";
import { CLASE_CAMPO } from "@/components/ui/field";

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
    <PantallaCuenta>
        <TarjetaCuenta
          icono={KeyRound}
          titulo="¿Olvidaste tu contraseña?"
          descripcion="Ingresa tu correo electrónico y te enviaremos un enlace para restablecerla."
        >

          {resultado ? (
            <div className="mt-7 space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-marca-suave text-marca">
                <MailCheck className="h-7 w-7" aria-hidden />
              </div>
              <div className="space-y-2 rounded-tarjeta border border-borde bg-fondo-suave p-5 text-sm">
                <p className="font-semibold text-tinta">Revisa tu bandeja de entrada</p>
                <p className="text-tinta-suave">{resultado.mensaje}</p>
              </div>
              {resultado.resetUrlDesarrollo && (
                <div className="rounded-tarjeta border border-atencion-borde/30 bg-atencion-fondo p-4 text-left text-xs text-atencion-texto">
                  <p className="font-bold">Entorno de desarrollo sin correo configurado:</p>
                  <Link
                    href={resultado.resetUrlDesarrollo.replace(/^https?:\/\/[^/]+/, "")}
                    className="mt-1 inline-block break-all font-semibold text-marca underline"
                  >
                    Abrir enlace de restablecimiento de prueba →
                  </Link>
                </div>
              )}
              <Link
                href="/login"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-tinta px-6 text-base font-semibold text-white transition-colors hover:bg-marca-oscuro"
              >
                Volver a iniciar sesión
              </Link>
            </div>
          ) : (
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
                  placeholder="tu-correo@agroan.com"
                  className={`${CLASE_CAMPO} mt-1.5`}
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
                className="min-h-12 w-full rounded-full bg-tinta px-6 text-base font-semibold text-white transition-colors hover:bg-marca-oscuro disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviando ? "Enviando enlace..." : "Enviar enlace de recuperación"}
              </button>

              <p className="text-center text-sm text-tinta-suave">
                <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-marca hover:underline">
                  Volver a iniciar sesión
                </Link>
              </p>
            </form>
          )}
        </TarjetaCuenta>
    </PantallaCuenta>
  );
}
