import { Handshake, LineChart, ShieldCheck, type LucideIcon } from "lucide-react";
import { EnlaceBoton } from "@/components/enlace-boton";
import { EncabezadoPublico } from "@/components/publico/encabezado-publico";

const BENEFICIOS: { icono: LucideIcon; titulo: string; descripcion: string }[] = [
  {
    icono: ShieldCheck,
    titulo: "Registros protegidos",
    descripcion:
      "Cada labor queda anotada con su fecha, quién la hizo y qué insumos se usaron. Si alguien cambia un registro, se nota.",
  },
  {
    icono: LineChart,
    titulo: "Datos claros",
    descripcion:
      "Mira los rendimientos de cosechas anteriores y las campañas en curso en un solo lugar.",
  },
  {
    icono: Handshake,
    titulo: "Preventa transparente",
    descripcion:
      "Compradores e inversionistas pueden ver el estado y el historial de cada parcela disponible antes de negociar.",
  },
];

export default function WelcomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <EncabezadoPublico>
        <EnlaceBoton href="/parcelas" variante="secundario">
          Ver parcelas disponibles
        </EnlaceBoton>
        <EnlaceBoton href="/login">Ingresar</EnlaceBoton>
      </EncabezadoPublico>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <h1 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            Encuentra tu próxima producción de forma rápida y sencilla
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-700">
            AgriTrack es la plataforma de AgroAn. Anota cada labor de campo, mira el
            rendimiento de cada parcela y comparte información clara con compradores e
            inversionistas.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <EnlaceBoton href="/parcelas">Ver parcelas disponibles</EnlaceBoton>
            <EnlaceBoton href="/login" variante="secundario">
              Ingresar
            </EnlaceBoton>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {BENEFICIOS.map(({ icono: Icono, titulo, descripcion }) => (
              <div
                key={titulo}
                className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
              >
                <Icono className="h-8 w-8 text-emerald-700" aria-hidden />
                <h2 className="mt-3 text-xl font-bold text-emerald-800">{titulo}</h2>
                <p className="mt-2 text-base text-stone-700">{descripcion}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white py-6 text-center text-base text-stone-600">
        AgroAn © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
