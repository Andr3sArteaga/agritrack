"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Advertencia } from "@/components/estado/advertencia";
import { LandingNavbar } from "@/components/publico/landing-navbar";
import { api, apiErrorMessage } from "@/lib/api";

export default function SolicitarAccesoPage() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await api.post("/auth/solicitar-acceso", {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
        password,
      });
      setEnviado(true);
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo enviar la solicitud de acceso"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8faf9] text-[#17211D]">
      <LandingNavbar />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-lg rounded-3xl border border-[#E4EAE6] bg-white p-7 shadow-xs sm:p-8">
          <div className="text-center">
            <span className="inline-block rounded-full bg-[#006B4F]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#006B4F]">
              Equipo AgroAn
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#17211D]">
              Solicitar acceso a AgriTrack
            </h1>
            <p className="mt-1.5 text-sm text-[#68736D]">
              Completa tus datos. El Jefe revisará tu solicitud y asignará tu rol.
            </p>
          </div>

          {enviado ? (
            <div className="mt-7 space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F5EF] text-[#006B4F]">
                <CheckCircle2 className="h-8 w-8" aria-hidden />
              </div>
              <div className="space-y-2 rounded-2xl border border-[#E4EAE6] bg-[#f8faf9] p-5 text-sm">
                <p className="font-semibold text-[#17211D]">
                  Solicitud registrada en estado pendiente
                </p>
                <p className="text-[#68736D]">
                  Aún no tienes acceso al sistema. Cuando el Jefe apruebe tu cuenta, recibirás un correo de confirmación en{" "}
                  <span className="font-semibold text-[#17211D]">{email}</span>.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#004b36] px-6 text-base font-semibold text-white transition-colors hover:bg-[#00a859]"
              >
                Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-7 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="nombre" className="block text-sm font-semibold text-[#17211D]">
                    Nombre
                  </label>
                  <input
                    id="nombre"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Carlos"
                    className="mt-1.5 min-h-11 w-full rounded-2xl border border-[#E4EAE6] bg-[#f8faf9] px-4 text-base text-[#17211D] transition-colors focus:border-[#006B4F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006B4F]/20"
                  />
                </div>
                <div>
                  <label htmlFor="apellido" className="block text-sm font-semibold text-[#17211D]">
                    Apellido
                  </label>
                  <input
                    id="apellido"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    placeholder="Ej. Mendoza"
                    className="mt-1.5 min-h-11 w-full rounded-2xl border border-[#E4EAE6] bg-[#f8faf9] px-4 text-base text-[#17211D] transition-colors focus:border-[#006B4F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006B4F]/20"
                  />
                </div>
              </div>

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
                  placeholder="carlos@agroan.com"
                  className="mt-1.5 min-h-11 w-full rounded-2xl border border-[#E4EAE6] bg-[#f8faf9] px-4 text-base text-[#17211D] transition-colors focus:border-[#006B4F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006B4F]/20"
                />
              </div>

              <div>
                <label htmlFor="telefono" className="block text-sm font-semibold text-[#17211D]">
                  Número de teléfono
                </label>
                <input
                  id="telefono"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+591 71234567"
                  className="mt-1.5 min-h-11 w-full rounded-2xl border border-[#E4EAE6] bg-[#f8faf9] px-4 text-base text-[#17211D] transition-colors focus:border-[#006B4F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006B4F]/20"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-[#17211D]">
                  Contraseña
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="password"
                    type={mostrarPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              {error && (
                <Advertencia tipo="CRITICO" titulo="No se pudo enviar la solicitud" rol="alert">
                  {error}
                </Advertencia>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="min-h-12 w-full rounded-full bg-[#004b36] px-6 text-base font-semibold text-white transition-colors hover:bg-[#00a859] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviando ? "Enviando solicitud..." : "Enviar solicitud"}
              </button>

              <p className="text-center text-sm text-[#68736D]">
                ¿Ya tienes una cuenta activa?{" "}
                <Link href="/login" className="font-semibold text-[#006B4F] hover:underline">
                  Ingresar
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
