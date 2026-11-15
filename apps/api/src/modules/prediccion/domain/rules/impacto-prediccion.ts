/**
 * Analisis de impacto en tiempo real de las variables ingresadas sobre la
 * estimacion de rendimiento del modelo Random Forest.
 *
 * No contiene reglas agronomicas inventadas: toda comparacion surge de evaluar
 * el modelo entrenado frente a la linea base o a la mediana historica del
 * conjunto de entrenamiento.
 */
import type {
  Codificador,
  EfectoImpacto,
  EntradaPredictores,
  EscenariosImpacto,
  EscenarioSiembraImpacto,
  FactorImpacto,
  OrigenDatos,
  ResultadoImpacto,
} from '../modelo-rendimiento';
import { codificar, diasDesdePrimeroDeOctubre } from './variables';

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const ESCENARIOS_VACIOS: EscenariosImpacto = {
  positivo: null,
  neutro: null,
  negativo: null,
};

export const UMBRAL_IMPACTO_T_HA = 0.01;

const redondear2 = (valor: number): number => Math.round(valor * 100) / 100;

const promedio = (valores: readonly number[]): number =>
  valores.reduce((acc, v) => acc + v, 0) / valores.length;

const formatoDelta = (delta: number): string =>
  delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2);

export function clasificarEfecto(delta: number): EfectoImpacto {
  if (delta >= UMBRAL_IMPACTO_T_HA) return 'POSITIVO';
  if (delta <= -UMBRAL_IMPACTO_T_HA) return 'NEGATIVO';
  return 'NEUTRO';
}

export function resolverVariedadCanonica(
  variedad: string | null,
  categoriasVariedad: readonly string[],
): string | null {
  const limpia = variedad?.trim();
  if (!limpia) return null;
  const exacta = categoriasVariedad.find(
    (categoria) => categoria.toLowerCase() === limpia.toLowerCase(),
  );
  return exacta ?? limpia;
}

export interface ParametrosImpacto {
  tipoActividad?: string;
  haSembradas: number | null;
  fechaSiembra: Date | null;
  variedad: string | null;
  inicioCampana: Date;
  lineaBase_t_ha: number | null;
  origenDatos: OrigenDatos;
  etiquetaDatos: string | null;
  versionModelo: string | null;
  codificador: Codificador | null;
  predecir: ((X: number[][]) => number[]) | null;
  haReferencia?: number | null;
}

export function calcularImpactoPrediccion(
  params: ParametrosImpacto,
): ResultadoImpacto {
  const {
    tipoActividad,
    haSembradas,
    fechaSiembra,
    variedad,
    inicioCampana,
    lineaBase_t_ha,
    origenDatos,
    etiquetaDatos,
    versionModelo,
    codificador,
    predecir,
    haReferencia,
  } = params;

  const variedadesConocidas = codificador?.categoriasVariedad ?? [];
  const advertenciasBase: string[] = [];
  if (origenDatos === 'demo_enmascarado' && codificador) {
    advertenciasBase.push('Calculada con datos iniciales (V1).');
  }

  // Labores posteriores a la siembra: el modelo solo usa predictores pre-siembra.
  if (tipoActividad && tipoActividad !== 'SIEMBRA') {
    let estimadoActual: number | null = null;
    if (codificador && predecir && haSembradas !== null && haSembradas > 0) {
      const variedadCanonica = resolverVariedadCanonica(
        variedad,
        codificador.categoriasVariedad,
      );
      const dias = fechaSiembra
        ? diasDesdePrimeroDeOctubre(inicioCampana, fechaSiembra)
        : null;
      const matriz = codificar(
        [
          {
            haSembradas,
            diasSiembra: dias,
            variedad: variedadCanonica,
            lag1: null,
          },
        ],
        codificador,
      );
      estimadoActual = redondear2(predecir(matriz.X)[0]);
    }
    const referencia =
      lineaBase_t_ha !== null ? redondear2(lineaBase_t_ha) : estimadoActual;
    return {
      efectoGlobal: 'NEUTRO',
      resumen:
        'Impacto neutro: la producción estimada se mantiene igual. Las labores posteriores a la siembra se registran para trazabilidad e integridad, pero no modifican el modelo pre-siembra.',
      estimado_t_ha: estimadoActual,
      referencia_t_ha: referencia,
      diferencia_t_ha: 0,
      produccion_estimada_tn:
        estimadoActual !== null && haSembradas !== null && haSembradas > 0
          ? redondear2(estimadoActual * haSembradas)
          : null,
      fuenteReferencia:
        lineaBase_t_ha !== null
          ? 'linea_base'
          : estimadoActual !== null
            ? 'mediana_modelo'
            : 'sin_referencia',
      version_modelo: versionModelo,
      origen_datos: origenDatos,
      etiqueta_datos: etiquetaDatos,
      variedadesConocidas,
      advertencias: advertenciasBase,
      factores: [],
      escenarios: ESCENARIOS_VACIOS,
    };
  }

  const refLineaBase =
    lineaBase_t_ha !== null ? redondear2(lineaBase_t_ha) : null;

  if (!codificador || !predecir) {
    return {
      efectoGlobal: 'NEUTRO',
      resumen:
        'Sin modelo entrenado para calcular el impacto en tiempo real: la producción estimada se mantiene igual.',
      estimado_t_ha: null,
      referencia_t_ha: refLineaBase,
      diferencia_t_ha: null,
      produccion_estimada_tn: null,
      fuenteReferencia: refLineaBase !== null ? 'linea_base' : 'sin_referencia',
      version_modelo: versionModelo,
      origen_datos: origenDatos,
      etiqueta_datos: etiquetaDatos,
      variedadesConocidas,
      advertencias: [
        ...advertenciasBase,
        'Todavía no hay un modelo Random Forest entrenado para este cultivo.',
      ],
      factores: [],
      escenarios: ESCENARIOS_VACIOS,
    };
  }

  if (
    haSembradas === null ||
    !Number.isFinite(haSembradas) ||
    haSembradas <= 0
  ) {
    return {
      efectoGlobal: 'NEUTRO',
      resumen:
        'Ingresa las hectáreas sembradas (mayores a 0) para calcular el impacto en la producción estimada.',
      estimado_t_ha: null,
      referencia_t_ha: refLineaBase,
      diferencia_t_ha: null,
      produccion_estimada_tn: null,
      fuenteReferencia: refLineaBase !== null ? 'linea_base' : 'sin_referencia',
      version_modelo: versionModelo,
      origen_datos: origenDatos,
      etiqueta_datos: etiquetaDatos,
      variedadesConocidas,
      advertencias: [
        ...advertenciasBase,
        'Falta indicar la superficie sembrada en hectáreas.',
      ],
      factores: [],
      escenarios: ESCENARIOS_VACIOS,
    };
  }

  const variedadCanonica = resolverVariedadCanonica(
    variedad,
    codificador.categoriasVariedad,
  );
  const diasSiembra = fechaSiembra
    ? diasDesdePrimeroDeOctubre(inicioCampana, fechaSiembra)
    : null;
  const medianaDias = codificador.medianaDiasSiembra;
  const haRef =
    haReferencia !== null &&
    haReferencia !== undefined &&
    Number.isFinite(haReferencia) &&
    haReferencia > 0
      ? haReferencia
      : haSembradas;

  const entradas: EntradaPredictores[] = [
    { haSembradas, diasSiembra, variedad: variedadCanonica, lag1: null },
    {
      haSembradas,
      diasSiembra: medianaDias,
      variedad: variedadCanonica,
      lag1: null,
    },
    { haSembradas: haRef, diasSiembra, variedad: variedadCanonica, lag1: null },
  ];

  const categorias = codificador.categoriasVariedad;
  const inicioVariedades = entradas.length;
  for (const cat of categorias) {
    entradas.push({ haSembradas, diasSiembra, variedad: cat, lag1: null });
  }

  const inicioNeutro = entradas.length;
  if (categorias.length > 0) {
    for (const cat of categorias) {
      entradas.push({
        haSembradas: haRef,
        diasSiembra: medianaDias,
        variedad: cat,
        lag1: null,
      });
    }
  } else {
    entradas.push({
      haSembradas: haRef,
      diasSiembra: medianaDias,
      variedad: null,
      lag1: null,
    });
  }

  const matriz = codificar(entradas, codificador);
  const predicciones = predecir(matriz.X);

  const predActual = predicciones[0];
  const predBaseFecha = predicciones[1];
  const predBaseHa = predicciones[2];
  const predsVariedades = predicciones.slice(
    inicioVariedades,
    inicioVariedades + categorias.length,
  );
  const predNeutroModelo = promedio(predicciones.slice(inicioNeutro));

  const estimado_t_ha = redondear2(predActual);
  const sinVariablesEspecificadas =
    !fechaSiembra && !variedadCanonica && Math.abs(haSembradas - haRef) < 0.01;
  const fuenteReferencia =
    refLineaBase !== null ? 'linea_base' : 'mediana_modelo';
  const referenciaBase =
    refLineaBase !== null ? refLineaBase : redondear2(predNeutroModelo);
  const referencia_t_ha = sinVariablesEspecificadas
    ? estimado_t_ha
    : referenciaBase;
  const diferencia_t_ha = sinVariablesEspecificadas
    ? 0
    : redondear2(estimado_t_ha - referencia_t_ha);
  const produccion_estimada_tn = redondear2(estimado_t_ha * haSembradas);
  const efectoGlobal = clasificarEfecto(diferencia_t_ha);

  const resumen = sinVariablesEspecificadas
    ? `Impacto neutro: la producción estimada se mantiene igual (${estimado_t_ha.toFixed(2)} t/ha con los valores de referencia del lote).`
    : efectoGlobal === 'POSITIVO'
      ? `Impacto positivo: la producción estimada aumenta a ${estimado_t_ha.toFixed(2)} t/ha (${formatoDelta(diferencia_t_ha)} t/ha frente a la referencia de ${referencia_t_ha.toFixed(2)} t/ha).`
      : efectoGlobal === 'NEGATIVO'
        ? `Impacto negativo: la producción estimada disminuye a ${estimado_t_ha.toFixed(2)} t/ha (${formatoDelta(diferencia_t_ha)} t/ha frente a la referencia de ${referencia_t_ha.toFixed(2)} t/ha).`
        : `Impacto neutro: la producción estimada se mantiene igual (${estimado_t_ha.toFixed(2)} t/ha frente a la referencia de ${referencia_t_ha.toFixed(2)} t/ha).`;

  const advertencias = [...advertenciasBase];
  if (matriz.imputadas[0]) {
    advertencias.push(
      'Falta la fecha de siembra: se usó la mediana histórica del entrenamiento (valor imputado).',
    );
  }
  if (matriz.variedadDesconocida[0]) {
    advertencias.push('La variedad no estaba en los datos de entrenamiento.');
  }
  if (fuenteReferencia === 'mediana_modelo') {
    advertencias.push(
      'Sin línea base de campañas anteriores: se compara contra la mediana histórica del modelo.',
    );
  }

  // Factor 1: Fecha de siembra
  const factorFecha = construirFactorFecha(
    fechaSiembra,
    diasSiembra,
    medianaDias,
    predActual,
    predBaseFecha,
  );

  // Factor 2: Variedad
  const factorVariedad = construirFactorVariedad(
    variedadCanonica,
    categorias,
    predActual,
    predsVariedades,
  );

  // Factor 3: Superficie sembrada
  const factorHa = construirFactorHa(
    haSembradas,
    haRef,
    predActual,
    predBaseHa,
    estimado_t_ha,
    produccion_estimada_tn,
  );

  const escenarios = calcularEscenariosImpacto({
    inicioCampana,
    haRef,
    referencia_t_ha: referenciaBase,
    codificador,
    predecir,
  });

  return {
    efectoGlobal,
    resumen,
    estimado_t_ha,
    referencia_t_ha,
    diferencia_t_ha,
    produccion_estimada_tn,
    fuenteReferencia,
    version_modelo: versionModelo,
    origen_datos: origenDatos,
    etiqueta_datos: etiquetaDatos,
    variedadesConocidas,
    advertencias,
    factores: [factorFecha, factorVariedad, factorHa],
    escenarios,
  };
}

function construirFactorFecha(
  fechaSiembra: Date | null,
  diasSiembra: number | null,
  medianaDias: number | null,
  predActual: number,
  predBaseFecha: number,
): FactorImpacto {
  if (!fechaSiembra || diasSiembra === null || medianaDias === null) {
    return {
      variable: 'fecha_siembra',
      etiqueta: 'Fecha de siembra',
      valorIngresado: fechaSiembra
        ? fechaSiembra.toISOString().slice(0, 10)
        : 'Sin fecha (mediana)',
      efecto: 'NEUTRO',
      delta_t_ha: 0,
      detalle:
        'Sin fecha ingresada: se aplica la mediana histórica del modelo (se mantiene igual).',
    };
  }
  const delta = redondear2(predActual - predBaseFecha);
  const efecto = clasificarEfecto(delta);
  const fechaTexto = `${fechaSiembra.toISOString().slice(0, 10)} (${diasSiembra} d desde 1 oct)`;
  const detalle =
    efecto === 'POSITIVO'
      ? `Fecha favorable: aumenta la estimación en ${formatoDelta(delta)} t/ha frente a la mediana histórica (${medianaDias} d).`
      : efecto === 'NEGATIVO'
        ? `Fecha desfavorable: disminuye la estimación en ${formatoDelta(delta)} t/ha frente a la mediana histórica (${medianaDias} d).`
        : `Efecto neutro frente a la mediana histórica de siembra (${medianaDias} d).`;
  return {
    variable: 'fecha_siembra',
    etiqueta: 'Fecha de siembra',
    valorIngresado: fechaTexto,
    efecto,
    delta_t_ha: delta,
    detalle,
  };
}

function construirFactorVariedad(
  variedadCanonica: string | null,
  categorias: readonly string[],
  predActual: number,
  predsVariedades: readonly number[],
): FactorImpacto {
  if (
    !variedadCanonica ||
    !categorias.includes(variedadCanonica) ||
    predsVariedades.length === 0
  ) {
    return {
      variable: 'variedad',
      etiqueta: 'Variedad',
      valorIngresado: variedadCanonica ?? 'Sin especificar',
      efecto: 'NEUTRO',
      delta_t_ha: 0,
      detalle: !variedadCanonica
        ? 'Sin variedad seleccionada: elige una variedad histórica para evaluar su efecto.'
        : 'Variedad fuera del historial de entrenamiento: el modelo no le asigna ventaja ni penalización.',
    };
  }
  const promedioVariedades = promedio(predsVariedades);
  const delta = redondear2(predActual - promedioVariedades);
  const efecto = clasificarEfecto(delta);
  const detalle =
    efecto === 'POSITIVO'
      ? `Variedad favorable: aumenta la estimación en ${formatoDelta(delta)} t/ha frente al promedio de variedades históricas.`
      : efecto === 'NEGATIVO'
        ? `Variedad desfavorable: disminuye la estimación en ${formatoDelta(delta)} t/ha frente al promedio de variedades históricas.`
        : 'Variedad neutra: rinde igual que el promedio de las variedades históricas.';
  return {
    variable: 'variedad',
    etiqueta: 'Variedad',
    valorIngresado: variedadCanonica,
    efecto,
    delta_t_ha: delta,
    detalle,
  };
}

function construirFactorHa(
  haSembradas: number,
  haRef: number,
  predActual: number,
  predBaseHa: number,
  estimado_t_ha: number,
  produccion_estimada_tn: number,
): FactorImpacto {
  const delta = redondear2(predActual - predBaseHa);
  const efecto = clasificarEfecto(delta);
  const resumenVolumen = `Producción total estimada: ${produccion_estimada_tn.toFixed(2)} t (${estimado_t_ha.toFixed(2)} t/ha × ${haSembradas} ha).`;
  const detalle =
    efecto === 'POSITIVO'
      ? `La superficie de ${haSembradas} ha mejora la estimación en ${formatoDelta(delta)} t/ha respecto a ${haRef} ha. ${resumenVolumen}`
      : efecto === 'NEGATIVO'
        ? `La superficie de ${haSembradas} ha reduce la estimación en ${formatoDelta(delta)} t/ha respecto a ${haRef} ha. ${resumenVolumen}`
        : `Superficie de ${haSembradas} ha con efecto neutro en t/ha. ${resumenVolumen}`;
  return {
    variable: 'ha_sembradas',
    etiqueta: 'Superficie sembrada',
    valorIngresado: `${haSembradas} ha`,
    efecto,
    delta_t_ha: delta,
    detalle,
  };
}

function calcularEscenariosImpacto(params: {
  inicioCampana: Date;
  haRef: number;
  referencia_t_ha: number;
  codificador: Codificador;
  predecir: (X: number[][]) => number[];
}): EscenariosImpacto {
  const { inicioCampana, haRef, referencia_t_ha, codificador, predecir } = params;
  const anioOctubre =
    inicioCampana.getUTCMonth() >= 6
      ? inicioCampana.getUTCFullYear()
      : inicioCampana.getUTCFullYear() - 1;
  const primeroDeOctubreMs = Date.UTC(anioOctubre, 9, 1);

  const diasBase = [12, 14, 20, 27, 28, 35, 43, 44, 60, 68, 75, 85, 95, 110];
  const ahoraMs = Date.now();
  const diasVigentes = diasBase.filter(
    (d) => primeroDeOctubreMs + d * MS_POR_DIA <= ahoraMs,
  );
  const diasCandidatos =
    diasVigentes.length > 0 ? diasVigentes : [12, 27, 43, 60, 100];

  const variedades =
    codificador.categoriasVariedad.length > 0
      ? codificador.categoriasVariedad
      : ['6410'];
  const haCandidatas = [
    ...new Set(
      [
        redondear2(haRef),
        redondear2(haRef * 0.9),
        redondear2(haRef * 0.75),
        redondear2(haRef * 1.15),
      ].filter((ha) => ha > 0),
    ),
  ];

  interface Candidato {
    haSembradas: number;
    fechaSiembra: string;
    variedad: string;
    diasSiembra: number;
  }

  const candidatos: Candidato[] = [];
  for (const ha of haCandidatas) {
    for (const dias of diasCandidatos) {
      const fechaTexto = new Date(primeroDeOctubreMs + dias * MS_POR_DIA)
        .toISOString()
        .slice(0, 10);
      for (const variedad of variedades) {
        candidatos.push({
          haSembradas: ha,
          fechaSiembra: fechaTexto,
          variedad,
          diasSiembra: dias,
        });
      }
    }
  }

  const entradas: EntradaPredictores[] = [
    { haSembradas: haRef, diasSiembra: null, variedad: null, lag1: null },
    ...candidatos.map((c) => ({
      haSembradas: c.haSembradas,
      diasSiembra: c.diasSiembra,
      variedad: c.variedad,
      lag1: null,
    })),
  ];

  const matriz = codificar(entradas, codificador);
  const preds = predecir(matriz.X);
  const predBaseSinDetalle = redondear2(preds[0]);

  let positivo: EscenarioSiembraImpacto | null = null;
  let negativo: EscenarioSiembraImpacto | null = null;
  let neutro: EscenarioSiembraImpacto | null = null;

  candidatos.forEach((candidato, indice) => {
    const estimado = redondear2(preds[indice + 1]);
    const diferencia = redondear2(estimado - referencia_t_ha);
    const actual: EscenarioSiembraImpacto = {
      haSembradas: candidato.haSembradas,
      fechaSiembra: candidato.fechaSiembra,
      variedad: candidato.variedad,
      estimado_t_ha: estimado,
      diferencia_t_ha: diferencia,
    };

    if (diferencia >= UMBRAL_IMPACTO_T_HA) {
      const mejoraDelta =
        !positivo || diferencia > positivo.diferencia_t_ha;
      const desempateHaRef =
        positivo !== null &&
        diferencia === positivo.diferencia_t_ha &&
        Math.abs(candidato.haSembradas - haRef) <
          Math.abs(positivo.haSembradas - haRef);
      if (mejoraDelta || desempateHaRef) {
        positivo = actual;
      }
    }

    if (diferencia <= -UMBRAL_IMPACTO_T_HA) {
      if (!negativo || diferencia < negativo.diferencia_t_ha) {
        negativo = actual;
      }
    }

    if (Math.abs(diferencia) < UMBRAL_IMPACTO_T_HA) {
      if (
        !neutro ||
        Math.abs(diferencia) < Math.abs(neutro.diferencia_t_ha)
      ) {
        neutro = actual;
      }
    }
  });

  if (!neutro) {
    neutro = {
      haSembradas: redondear2(haRef),
      fechaSiembra: '',
      variedad: '',
      estimado_t_ha: predBaseSinDetalle,
      diferencia_t_ha: 0,
    };
  }

  return { positivo, neutro, negativo };
}
