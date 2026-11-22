"use client";

import { Eye, LandPlot, Pencil, Power, Ruler, Tag as IconoTag, Wallet } from "lucide-react";
import { notFound } from "next/navigation";
import { useState } from "react";
import { Advertencia } from "@/components/estado/advertencia";
import { ChipRegistrado } from "@/components/estado/desglose-areas";
import { EstadoBadge } from "@/components/estado/estado-badge";
import { EstadoVacio } from "@/components/estado/estado-vacio";
import { MarcadorPendiente } from "@/components/estado/marcadores";
import { ActionMenu } from "@/components/ui/action-menu";
import { ActivityItem } from "@/components/ui/activity-item";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CropChip } from "@/components/ui/crop-chip";
import { CLASE_CAMPO, Field } from "@/components/ui/field";
import { ListRow } from "@/components/ui/list-row";
import { ParcelThumb } from "@/components/ui/parcel-thumb";
import { RangeBar } from "@/components/ui/range-bar";
import { SectionGroup } from "@/components/ui/section-group";
import { StatCard } from "@/components/ui/stat-card";
import { Tag } from "@/components/ui/tag";
import type { PoligonoGeoJson } from "@/lib/types";

/** Contorno de ejemplo solo para ver la miniatura. */
const POLIGONO_EJEMPLO: PoligonoGeoJson = {
  type: "Polygon",
  coordinates: [[[-62.58, -17.74], [-62.575, -17.738], [-62.572, -17.743], [-62.579, -17.746], [-62.58, -17.74]]],
};

const COLORES = [
  ["marca", "bg-marca"], ["marca-hover", "bg-marca-hover"], ["marca-vivo", "bg-marca-vivo"],
  ["marca-suave", "bg-marca-suave"], ["tinta", "bg-tinta"], ["tinta-suave", "bg-tinta-suave"],
  ["borde", "bg-borde"], ["fondo", "bg-fondo"], ["fondo-suave", "bg-fondo-suave"],
] as const;

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-[22px] font-semibold text-tinta">{titulo}</h2>
      {children}
    </section>
  );
}

/** Muestra de los componentes base (solo en desarrollo). Ruta: /muestra-componentes */
export default function MuestraComponentes() {
  const [resaltada, setResaltada] = useState<string | null>(null);
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto w-full max-w-5xl space-y-12 px-4 py-10 sm:px-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-marca">Solo en desarrollo</p>
        <h1 className="mt-1 text-[28px] font-semibold text-tinta">Componentes base de AgriTrack</h1>
        <p className="mt-1 text-base text-tinta-suave">
          Los valores son de ejemplo, solo para ver cómo se dibujan. No son datos reales.
        </p>
      </header>

      <Seccion titulo="Colores de marca y superficies">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {COLORES.map(([nombre, clase]) => (
            <div key={nombre}>
              <div className={`h-14 rounded-control border border-borde ${clase}`} />
              <p className="mt-1 text-sm text-tinta-suave">{nombre}</p>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Tipografía (Inter)">
        <Card className="space-y-2 p-6">
          <p className="text-[28px] font-semibold">Título de página · 28 px</p>
          <p className="text-[22px] font-semibold">Título de sección · 22 px</p>
          <p className="text-lg font-semibold">Subtítulo · 18 px</p>
          <p className="text-base">Cuerpo · 16 px. Frases cortas y claras.</p>
          <p className="text-sm text-tinta-suave">Texto secundario · 14 px</p>
          <p className="text-xs text-tinta-suave">Etiqueta mínima · 12 px</p>
        </Card>
      </Seccion>

      <Seccion titulo="Estados (color + ícono + palabra)">
        <Card className="flex flex-wrap items-center gap-3 p-6">
          <EstadoBadge estado="BIEN" />
          <EstadoBadge estado="ATENCION" />
          <EstadoBadge estado="CRITICO" />
          <EstadoBadge estado="SIN_DATOS" />
          <ChipRegistrado />
          <MarcadorPendiente tipo="DATOS" corto />
        </Card>
      </Seccion>

      <Seccion titulo="Etiquetas y cultivos (no son estados)">
        <Card className="flex flex-wrap items-center gap-2 p-6">
          <Tag tono="marca" icono={IconoTag}>En preventa</Tag>
          <Tag>Comprador</Tag>
          <CropChip cultivo="Soya" />
          <CropChip cultivo="Sorgo" />
          <CropChip cultivo="Trigo" />
          <CropChip cultivo="Sésamo" />
          <CropChip cultivo="Maíz" />
          <CropChip cultivo={null} />
        </Card>
      </Seccion>

      <Seccion titulo="Botones">
        <Card className="flex flex-wrap items-center gap-3 p-6">
          <Button icono={LandPlot}>Nueva parcela</Button>
          <Button variante="secundario">Cancelar</Button>
          <Button variante="fantasma">Ver todo</Button>
          <Button variante="peligro" icono={Power}>Desactivar</Button>
          <Button disabled>Guardando...</Button>
          <LinkButton href="/muestra-componentes" variante="secundario">Enlace</LinkButton>
        </Card>
      </Seccion>

      <Seccion titulo="Tarjetas de valor">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icono={Ruler} etiqueta="Hectáreas totales" valor="90,08 ha" nota="Parcelas activas" />
          <StatCard icono={Wallet} etiqueta="Gastado" valor="Bs 12.400" ayuda="Solo gastos pagados." />
          <StatCard icono={Wallet} etiqueta="Costo por tonelada" valor={null} nota="Falta registrar la cosecha" />
        </div>
      </Seccion>

      <Seccion titulo="Lista agrupada (parcelas)">
        <Card className="px-4 py-2">
          <SectionGroup titulo={<EstadoBadge estado="ATENCION" tamano="sm" />} cantidad={1}>
            <ListRow
              miniatura={<ParcelThumb poligono={POLIGONO_EJEMPLO} color="var(--color-atencion-borde)" />}
              titulo="Parcela de ejemplo"
              detalle="17,97 ha"
              chips={<><CropChip cultivo="Trigo" /><Tag tono="marca" icono={IconoTag}>En preventa</Tag></>}
              resaltada={resaltada === "a"}
              onMouseEnter={() => setResaltada("a")}
              onMouseLeave={() => setResaltada(null)}
              acciones={
                <ActionMenu
                  acciones={[
                    { etiqueta: "Ver detalle", icono: Eye, onClick: () => undefined },
                    { etiqueta: "Editar", icono: Pencil, onClick: () => undefined },
                    { etiqueta: "Desactivar", icono: Power, onClick: () => undefined, peligro: true },
                  ]}
                />
              }
            />
          </SectionGroup>
          <SectionGroup titulo={<EstadoBadge estado="SIN_DATOS" tamano="sm" />} cantidad={1}>
            <ListRow
              miniatura={<ParcelThumb poligono={null} />}
              titulo="Parcela sin polígono"
              detalle="5 ha"
              chips={<CropChip cultivo={null} />}
              acciones={<ActionMenu acciones={[{ etiqueta: "Ver detalle", icono: Eye, onClick: () => undefined }]} />}
            />
          </SectionGroup>
        </Card>
      </Seccion>

      <Seccion titulo="Actividades (aspecto de tarea, sin estado inventado)">
        <Card className="px-4 py-2">
          <ActivityItem tipo="SIEMBRA" fecha="2026-10-15" descripcion="Siembra de la campaña." responsable="Luis F." />
          <ActivityItem
            tipo="FUMIGACION"
            fecha="2026-11-02"
            descripcion="Control de plagas en todo el lote."
            etiquetas={<Tag>Insumo: herbicida</Tag>}
          />
        </Card>
      </Seccion>

      <Seccion titulo="Barra de rango neutra (sin zonas de color)">
        <Card className="space-y-6 p-6">
          <RangeBar etiqueta="Acidez (pH)" valor={6.1} min={0} max={14} fecha="2026-11-10" />
          <RangeBar etiqueta="Humedad del suelo" valor={null} min={0} max={100} unidad="%" />
        </Card>
      </Seccion>

      <Seccion titulo="Formulario">
        <Card className="grid gap-4 p-6 sm:grid-cols-2">
          <Field etiqueta="Nombre de la parcela" ayuda="Como la conoce el equipo.">
            {(props) => <input {...props} className={CLASE_CAMPO} placeholder="Ej. Lote norte" />}
          </Field>
          <Field etiqueta="Hectáreas" error="Debe ser mayor que 0.">
            {(props) => <input {...props} type="number" className={CLASE_CAMPO} defaultValue={0} />}
          </Field>
          <Field etiqueta="Nota" opcional>
            {(props) => <textarea {...props} className={`${CLASE_CAMPO} py-2`} rows={2} />}
          </Field>
        </Card>
      </Seccion>

      <Seccion titulo="Avisos y vacíos (estilo actual, se migran por pantalla)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Advertencia tipo="ATENCION" titulo="No pudimos cargar los datos">Intenta de nuevo.</Advertencia>
          <EstadoVacio mini titulo="Todavía no hay labores registradas" />
        </div>
      </Seccion>
    </main>
  );
}
