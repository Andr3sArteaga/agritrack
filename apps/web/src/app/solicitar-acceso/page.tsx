"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff, UserPlus } from "lucide-react";
import { Advertencia } from "@/components/estado/advertencia";
import { PantallaCuenta, TarjetaCuenta } from "@/components/publico/pantalla-cuenta";
import { api, apiErrorMessage } from "@/lib/api";
import { CLASE_CAMPO } from "@/components/ui/field";

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
    <PantallaCuenta>
        <TarjetaCuenta
          icono={UserPlus}
          titulo="Solicitar acceso a AgriTrack"
          descripcion="Completa tus datos. El Jefe revisará tu solicitud y asignará tu rol." ancho="lg"
        >

          {enviado ? (
            <div className="mt-7 space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-marca-suave text-marca">
                <CheckCircle2 className="h-8 w-8" aria-hidden />
              </div>
              <div className="space-y-2 rounded-tarjeta border border-borde bg-fondo-suave p-5 text-sm">
                <p className="font-semibold text-tinta">
                  Solicitud registrada en estado pendiente
                </p>
                <p className="text-tinta-suave">
                  Aún no tienes acceso al sistema. Cuando el Jefe apruebe tu cuenta, recibirás un correo de confirmación en{" "}
                  <span className="font-semibold text-tinta">{email}</span>.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-tinta px-6 text-base font-semibold text-white transition-colors hover:bg-marca-oscuro"
              >
                Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-7 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="nombre" className="block text-sm font-semibold text-tinta">
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
                    className={`${CLASE_CAMPO} mt-1.5`}
                  />
                </div>
                <div>
                  <label htmlFor="apellido" className="block text-sm font-semibold text-tinta">
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
                    className={`${CLASE_CAMPO} mt-1.5`}
                  />
                </div>
              </div>

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
                  placeholder="carlos@agroan.com"
                  className={`${CLASE_CAMPO} mt-1.5`}
                />
              </div>

              <div>
                <label htmlFor="telefono" className="block text-sm font-semibold text-tinta">
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
                  className={`${CLASE_CAMPO} mt-1.5`}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-tinta">
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
                <Advertencia tipo="CRITICO" titulo="No se pudo enviar la solicitud" rol="alert">
                  {error}
                </Advertencia>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="min-h-12 w-full rounded-full bg-tinta px-6 text-base font-semibold text-white transition-colors hover:bg-marca-oscuro disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviando ? "Enviando solicitud..." : "Enviar solicitud"}
              </button>

              <p className="text-center text-sm text-tinta-suave">
                ¿Ya tienes una cuenta activa?{" "}
                <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-marca hover:underline">
                  Ingresar
                </Link>
              </p>
            </form>
          )}
        </TarjetaCuenta>
    </PantallaCuenta>
  );
}
