import writeXlsxFile, { type CellObject, type Row, type Sheet } from 'write-excel-file/node';
import type { ReporteCampanaDto } from '../application/dto/reporte-campana.dto';
import {
  ESTADO_CAMPANA_ETIQUETA,
  TIPO_ACTIVIDAD_ETIQUETA,
  formatearFechaHoraBolivia,
  formatearFechaReporte,
} from '../domain/rules/formatear-reporte-exportacion';

const VERDE_OSCURO = '#065f46';
const VERDE_SUAVE = '#ecfdf5';
const VERDE_SUBTITULO = '#d1fae5';
const GRIS_CABECERA = '#f5f5f4';
const GRIS_ALTERNO = '#fafaf9';
const BORDE_SUAVE = '#d6d3d1';
const TEXTO_PRINCIPAL = '#1c1917';
const TEXTO_SECUNDARIO = '#57534e';

function celdaTexto(
  valor: string,
  extra: Partial<CellObject> = {},
): CellObject {
  return {
    type: String,
    value: valor,
    textColor: TEXTO_PRINCIPAL,
    borderColor: BORDE_SUAVE,
    borderStyle: 'thin',
    ...extra,
  };
}

function celdaNumero(
  valor: number | null | undefined,
  formato = '#,##0.00',
  vacioTexto = '—',
): CellObject {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return celdaTexto(vacioTexto, {
      align: 'right',
      textColor: TEXTO_SECUNDARIO,
    });
  }
  return {
    type: Number,
    value: valor,
    format: formato,
    align: 'right',
    textColor: TEXTO_PRINCIPAL,
    borderColor: BORDE_SUAVE,
    borderStyle: 'thin',
  };
}

function filaSeccion(titulo: string, columnas: number): Row {
  const fila: Row = [
    {
      type: String,
      value: titulo,
      fontWeight: 'bold',
      fontSize: 11,
      textColor: VERDE_OSCURO,
      backgroundColor: VERDE_SUBTITULO,
      borderColor: VERDE_OSCURO,
      borderStyle: 'thin',
      columnSpan: columnas,
      height: 22,
      alignVertical: 'center',
    },
  ];
  for (let i = 1; i < columnas; i++) {
    fila.push(null);
  }
  return fila;
}

function construirHojaResumen(reporte: ReporteCampanaDto): Sheet<Buffer> {
  const alcanceTexto = reporte.periodo.porDefecto
    ? 'Campaña completa (sin filtro de fechas)'
    : 'Período personalizado (filtrado por fechas)';

  const datos: Row[] = [
    [
      {
        type: String,
        value: `AGRITRACK — REPORTE DE CAMPAÑA: ${reporte.parcela.nombre.toUpperCase()} (${reporte.campana.temporada})`,
        fontWeight: 'bold',
        fontSize: 13,
        textColor: '#ffffff',
        backgroundColor: VERDE_OSCURO,
        columnSpan: 4,
        height: 28,
        alignVertical: 'center',
      },
      null,
      null,
      null,
    ],
    [
      {
        type: String,
        value: `Cultivo: ${reporte.cultivo.nombre}  |  Estado: ${ESTADO_CAMPANA_ETIQUETA[reporte.campana.estado]}  |  Generado: ${formatearFechaHoraBolivia(reporte.generadoEn)} (Bolivia)`,
        fontStyle: 'italic',
        textColor: TEXTO_PRINCIPAL,
        backgroundColor: VERDE_SUAVE,
        columnSpan: 4,
        height: 20,
        alignVertical: 'center',
      },
      null,
      null,
      null,
    ],
    [],

    filaSeccion('1. PERÍODO DEL REPORTE', 4),
    [
      celdaTexto('Alcance', { fontWeight: 'bold', backgroundColor: GRIS_CABECERA }),
      celdaTexto(alcanceTexto, { fontWeight: 'bold' }),
      celdaTexto('Período consultado', { fontWeight: 'bold', backgroundColor: GRIS_CABECERA }),
      celdaTexto(
        `${formatearFechaReporte(reporte.periodo.desde)} al ${formatearFechaReporte(reporte.periodo.hasta)}`,
      ),
    ],
    [],

    filaSeccion('2. FICHA DE LA PARCELA Y CAMPAÑA', 4),
    [
      celdaTexto('Parcela', { fontWeight: 'bold', backgroundColor: GRIS_CABECERA }),
      celdaTexto(reporte.parcela.nombre),
      celdaTexto('Superficie (ha)', { fontWeight: 'bold', backgroundColor: GRIS_CABECERA }),
      celdaNumero(reporte.parcela.hectareas, '0.00'),
    ],
    [
      celdaTexto('Ubicación', { fontWeight: 'bold', backgroundColor: GRIS_CABECERA }),
      celdaTexto(reporte.parcela.ubicacionTexto),
      celdaTexto('Cultivo', { fontWeight: 'bold', backgroundColor: GRIS_CABECERA }),
      celdaTexto(reporte.cultivo.nombre),
    ],
    [
      celdaTexto('Temporada', { fontWeight: 'bold', backgroundColor: GRIS_CABECERA }),
      celdaTexto(reporte.campana.temporada),
      celdaTexto('Fechas oficiales', { fontWeight: 'bold', backgroundColor: GRIS_CABECERA }),
      celdaTexto(
        `${formatearFechaReporte(reporte.campana.fechaInicio)} al ${
          reporte.campana.fechaFin
            ? formatearFechaReporte(reporte.campana.fechaFin)
            : 'En curso'
        }`,
      ),
    ],
    [],

    filaSeccion('3. RENDIMIENTO Y COSTOS DEL PERÍODO', 4),
    [
      celdaTexto('Indicador', {
        fontWeight: 'bold',
        textColor: '#ffffff',
        backgroundColor: VERDE_OSCURO,
      }),
      celdaTexto('Valor', {
        fontWeight: 'bold',
        textColor: '#ffffff',
        backgroundColor: VERDE_OSCURO,
        align: 'right',
      }),
      celdaTexto('Unidad', {
        fontWeight: 'bold',
        textColor: '#ffffff',
        backgroundColor: VERDE_OSCURO,
      }),
      celdaTexto('Referencia / Observación', {
        fontWeight: 'bold',
        textColor: '#ffffff',
        backgroundColor: VERDE_OSCURO,
      }),
    ],
    [
      celdaTexto('Rendimiento real', { fontWeight: 'bold' }),
      celdaNumero(reporte.cosecha?.rendimientoTnHa, '0.00'),
      celdaTexto('t/ha'),
      celdaTexto(
        reporte.cosecha
          ? `Cosecha del ${formatearFechaReporte(reporte.cosecha.fecha)}`
          : 'Sin cosecha con rendimiento en el período',
      ),
    ],
    [
      celdaTexto('Total gastado (pagado)', { fontWeight: 'bold' }),
      celdaNumero(reporte.costos.gastado, '#,##0.00'),
      celdaTexto('Bs'),
      celdaTexto('Gastos pagados vigentes en el período consultado'),
    ],
    [
      celdaTexto('Total comprometido', { fontWeight: 'bold' }),
      celdaNumero(reporte.costos.comprometido, '#,##0.00'),
      celdaTexto('Bs'),
      celdaTexto('Gastos acordados en el período pendientes de pago'),
    ],
    [
      celdaTexto('Presupuesto de campaña', { fontWeight: 'bold' }),
      celdaNumero(reporte.costos.presupuesto, '#,##0.00'),
      celdaTexto('Bs'),
      celdaTexto(
        reporte.costos.presupuesto === null
          ? 'Sin presupuesto definido'
          : 'Corresponde a la campaña completa',
      ),
    ],
    [
      celdaTexto('Ahorro (Presupuesto - Gastado)', { fontWeight: 'bold' }),
      celdaNumero(reporte.costos.ahorro, '#,##0.00'),
      celdaTexto('Bs'),
      celdaTexto(
        reporte.costos.ahorro === null
          ? 'Requiere presupuesto definido'
          : reporte.costos.ahorro >= 0
            ? 'Saldo positivo respecto al presupuesto'
            : 'Exceso respecto al presupuesto',
      ),
    ],
    [
      celdaTexto('Costo por hectárea', { fontWeight: 'bold' }),
      celdaNumero(reporte.costos.costoPorHa, '#,##0.00'),
      celdaTexto('Bs/ha'),
      celdaTexto(`Calculado sobre ${reporte.parcela.hectareas} ha`),
    ],
    [
      celdaTexto('Costo por tonelada', { fontWeight: 'bold' }),
      celdaNumero(reporte.costos.costoPorTonelada, '#,##0.00'),
      celdaTexto('Bs/t'),
      celdaTexto(
        reporte.costos.costoPorTonelada === null
          ? 'Sin producción registrada en el período'
          : 'Gasto pagado / toneladas cosechadas',
      ),
    ],
  ];

  return {
    sheet: 'Resumen de Campaña',
    data: datos,
    columns: [{ width: 32 }, { width: 34 }, { width: 22 }, { width: 44 }],
  };
}

function construirHojaActividades(reporte: ReporteCampanaDto): Sheet<Buffer> {
  const encabezados = [
    '# Sec.',
    'Fecha',
    'Labor',
    'Descripción',
    'Insumo',
    'Cantidad',
    'Unidad',
    'Responsable',
    'Modalidad',
    'Rendimiento (t/ha)',
    'Observaciones',
  ];

  const datos: Row[] = [
    [
      {
        type: String,
        value: `ACTIVIDADES VIGENTES DEL PERÍODO (${formatearFechaReporte(reporte.periodo.desde)} al ${formatearFechaReporte(reporte.periodo.hasta)})`,
        fontWeight: 'bold',
        fontSize: 12,
        textColor: '#ffffff',
        backgroundColor: VERDE_OSCURO,
        columnSpan: encabezados.length,
        height: 26,
        alignVertical: 'center',
      },
      ...Array.from({ length: encabezados.length - 1 }, () => null),
    ],
    encabezados.map((titulo, idx) =>
      celdaTexto(titulo, {
        fontWeight: 'bold',
        textColor: '#ffffff',
        backgroundColor: '#14532d',
        align: idx === 0 ? 'center' : idx === 5 || idx === 9 ? 'right' : 'left',
      }),
    ),
  ];

  if (reporte.actividades.length === 0) {
    datos.push([
      celdaTexto(
        'No se registraron actividades vigentes dentro del período seleccionado.',
        {
          fontStyle: 'italic',
          textColor: TEXTO_SECUNDARIO,
          columnSpan: encabezados.length,
        },
      ),
      ...Array.from({ length: encabezados.length - 1 }, () => null),
    ]);
  } else {
    reporte.actividades.forEach((actividad, indice) => {
      const fondo = indice % 2 === 0 ? '#ffffff' : GRIS_ALTERNO;
      datos.push([
        {
          type: Number,
          value: actividad.secuencia,
          format: '0',
          align: 'center',
          backgroundColor: fondo,
          borderColor: BORDE_SUAVE,
          borderStyle: 'thin',
        },
        celdaTexto(formatearFechaReporte(actividad.fecha), { backgroundColor: fondo }),
        celdaTexto(TIPO_ACTIVIDAD_ETIQUETA[actividad.tipo], {
          fontWeight: 'bold',
          backgroundColor: fondo,
        }),
        celdaTexto(actividad.descripcion, { wrap: true, backgroundColor: fondo }),
        celdaTexto(actividad.insumo ?? '—', { backgroundColor: fondo }),
        {
          ...celdaNumero(actividad.cantidad, '#,##0.00'),
          backgroundColor: fondo,
        },
        celdaTexto(actividad.unidad ?? '—', { backgroundColor: fondo }),
        celdaTexto(actividad.responsableNombre, { backgroundColor: fondo }),
        celdaTexto(actividad.tercerizado ? 'Tercerizado' : 'Propio', {
          backgroundColor: fondo,
        }),
        {
          ...celdaNumero(actividad.rendimientoTnHa, '0.00'),
          backgroundColor: fondo,
        },
        celdaTexto(
          actividad.correccionDeId
            ? 'Corrección de registro anterior'
            : 'Registro original vigente',
          { backgroundColor: fondo },
        ),
      ]);
    });
  }

  return {
    sheet: 'Actividades del Período',
    data: datos,
    stickyRowsCount: 2,
    columns: [
      { width: 9 },
      { width: 14 },
      { width: 26 },
      { width: 40 },
      { width: 24 },
      { width: 12 },
      { width: 12 },
      { width: 24 },
      { width: 14 },
      { width: 18 },
      { width: 28 },
    ],
  };
}

export async function generarExcelReporteCampana(
  reporte: ReporteCampanaDto,
): Promise<Buffer> {
  return writeXlsxFile([
    construirHojaResumen(reporte),
    construirHojaActividades(reporte),
  ]).toBuffer();
}
