/**
 * Linea base en t/ha a partir de la produccion total que entrega el catalogo publico
 * (la API publica del listado solo trae toneladas; el detalle si trae t/ha).
 *
 * La produccion total viene redondeada a 2 decimales, asi que el resultado puede
 * diferir en 0,01 t/ha en parcelas muy chicas (menos de 1 ha). En el detalle se usa
 * el valor exacto que entrega la API.
 */
export function lineaBaseDesdeToneladas(
  toneladas: number | null,
  hectareas: number,
): number | null {
  if (toneladas === null || !(hectareas > 0)) return null;
  return Math.round((toneladas / hectareas) * 100) / 100;
}
