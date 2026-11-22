import { Bean, Leaf, Sprout, Wheat, type LucideIcon } from "lucide-react";

const COLORES = {
  verde: "bg-cultivo-verde-fondo text-cultivo-verde-texto",
  amarillo: "bg-cultivo-amarillo-fondo text-cultivo-amarillo-texto",
  naranja: "bg-cultivo-naranja-fondo text-cultivo-naranja-texto",
  morado: "bg-cultivo-morado-fondo text-cultivo-morado-texto",
  rojo: "bg-cultivo-rojo-fondo text-cultivo-rojo-texto",
  azul: "bg-cultivo-azul-fondo text-cultivo-azul-texto",
} as const;

type Color = keyof typeof COLORES;

/** Cultivos de AgroAn con su color e icono fijos. Otro cultivo toma un color estable por su nombre. */
const CONOCIDOS: Record<string, { color: Color; icono: LucideIcon }> = {
  soya: { color: "verde", icono: Bean },
  sorgo: { color: "naranja", icono: Wheat },
  trigo: { color: "amarillo", icono: Wheat },
  sesamo: { color: "morado", icono: Sprout },
};
const ORDEN: Color[] = ["verde", "amarillo", "naranja", "morado", "rojo", "azul"];

const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function estiloCultivo(nombre: string): { color: Color; icono: LucideIcon } {
  const clave = normalizar(nombre);
  const conocido = Object.entries(CONOCIDOS).find(([nombreConocido]) => clave.startsWith(nombreConocido));
  if (conocido) return conocido[1];
  const suma = [...clave].reduce((total, letra) => total + letra.charCodeAt(0), 0);
  return { color: ORDEN[suma % ORDEN.length], icono: Leaf };
}

/** Chip de cultivo: icono + nombre con un color fijo por cultivo. Sin cultivo: "Sin campaña". */
export function CropChip({ cultivo }: { cultivo: string | null }) {
  if (!cultivo) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-sindatos-borde bg-sindatos-fondo px-2.5 py-0.5 text-sm font-medium text-sindatos-texto">
        Sin campaña
      </span>
    );
  }
  const { color, icono: Icono } = estiloCultivo(cultivo);
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-medium ${COLORES[color]}`}
    >
      <Icono className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {cultivo}
    </span>
  );
}
