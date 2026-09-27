import Link from "next/link";

const BENEFICIOS = [
  {
    titulo: "Trazabilidad completa",
    descripcion:
      "Cada actividad queda registrada con fecha, responsable e insumos, protegida por una cadena de integridad verificable.",
  },
  {
    titulo: "Datos en tiempo real",
    descripcion:
      "Rendimientos históricos, campañas en curso y predicciones de cosecha en un solo panel.",
  },
  {
    titulo: "Preventa transparente",
    descripcion:
      "Compradores e inversionistas pueden ver el estado y el historial de cada parcela disponible antes de negociar.",
  },
];

export default function WelcomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-emerald-700">AgriTrack</span>
          <nav className="flex items-center gap-3">
            <Link
              href="/parcelas"
              className="rounded-md px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
            >
              Ver parcelas disponibles
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Ingresar
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            Encuentra tu próxima producción de forma rápida y sencilla
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-600">
            AgriTrack es la plataforma de gestión agrícola de AgroAn: registra
            cada actividad de campo, mide el rendimiento de tus parcelas y
            comparte información verificable con compradores e inversionistas.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/parcelas"
              className="rounded-md bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-800"
            >
              Ver parcelas disponibles
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-stone-300 bg-white px-6 py-3 text-base font-semibold text-stone-800 hover:bg-stone-100"
            >
              Ingresar
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="grid gap-6 sm:grid-cols-3">
            {BENEFICIOS.map((beneficio) => (
              <div
                key={beneficio.titulo}
                className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-emerald-800">
                  {beneficio.titulo}
                </h3>
                <p className="mt-2 text-sm text-stone-600">
                  {beneficio.descripcion}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white py-6 text-center text-sm text-stone-500">
        AgroAn © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
