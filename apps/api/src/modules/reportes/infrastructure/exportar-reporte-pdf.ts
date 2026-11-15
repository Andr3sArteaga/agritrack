import { createRequire } from 'node:module';
import * as path from 'node:path';
import type * as PdfMakeNamespace from 'pdfmake';
import type {
  Content,
  TableCell,
  TDocumentDefinitions,
  TFontDictionary,
} from 'pdfmake/interfaces';
import type { ReporteCampanaDto } from '../application/dto/reporte-campana.dto';
import {
  ESTADO_CAMPANA_ETIQUETA,
  TIPO_ACTIVIDAD_ETIQUETA,
  formatearFechaHoraBolivia,
  formatearFechaReporte,
  formatearMonedaBs,
  formatearNumero,
} from '../domain/rules/formatear-reporte-exportacion';

const VERDE_OSCURO = '#065f46';
const VERDE_SUAVE = '#ecfdf5';
const VERDE_BORDE = '#a7f3d0';
const AMBAR_FONDO = '#fffbeb';
const AMBAR_TEXTO = '#92400e';
const GRIS_BORDE = '#d6d3d1';
const GRIS_FONDO = '#f5f5f4';
const TEXTO_PRINCIPAL = '#1c1917';
const TEXTO_SECUNDARIO = '#57534e';

let instanciaPdfMake: typeof PdfMakeNamespace | null = null;

function obtenerPdfMake(): typeof PdfMakeNamespace {
  if (instanciaPdfMake) return instanciaPdfMake;

  const requireLocal = createRequire(__filename);
  const pdfMake = requireLocal('pdfmake') as typeof PdfMakeNamespace;
  const rutaFonts = requireLocal.resolve('pdfmake/fonts/Roboto');
  const directorioFonts = path.dirname(rutaFonts);
  const roboto = requireLocal(rutaFonts) as TFontDictionary;

  pdfMake.setFonts(roboto);
  pdfMake.setUrlAccessPolicy(() => false);
  pdfMake.setLocalAccessPolicy((rutaArchivo: string) =>
    path.resolve(rutaArchivo).startsWith(directorioFonts),
  );

  instanciaPdfMake = pdfMake;
  return pdfMake;
}

function encabezadoSeccion(titulo: string): Content {
  return {
    text: titulo.toUpperCase(),
    style: 'tituloSeccion',
    margin: [0, 14, 0, 6],
  };
}

function bloqueDato(etiqueta: string, valor: string): TableCell {
  return {
    stack: [
      { text: etiqueta, style: 'etiqueta' },
      { text: valor, style: 'valor', margin: [0, 2, 0, 0] },
    ],
    margin: [4, 4, 4, 4],
  };
}

function filaMetrica(
  indicador: string,
  valor: string,
  detalle: string,
  destacarPositivo?: boolean | null,
): TableCell[] {
  const colorValor =
    destacarPositivo === true
      ? '#065f46'
      : destacarPositivo === false
        ? '#b91c1c'
        : TEXTO_PRINCIPAL;
  return [
    { text: indicador, bold: true, color: TEXTO_PRINCIPAL },
    { text: valor, bold: true, alignment: 'right', color: colorValor },
    { text: detalle, color: TEXTO_SECUNDARIO, fontSize: 8.5 },
  ];
}

function tablaCostos(reporte: ReporteCampanaDto): Content {
  const { costos, cosecha, parcela } = reporte;
  const ahorroPositivo =
    costos.ahorro === null ? null : costos.ahorro >= 0 ? true : false;

  const filas: TableCell[][] = [
    [
      { text: 'Indicador', style: 'cabeceraTabla' },
      { text: 'Valor', style: 'cabeceraTabla', alignment: 'right' },
      { text: 'Referencia / Alcance', style: 'cabeceraTabla' },
    ],
    filaMetrica(
      'Rendimiento real',
      cosecha ? `${formatearNumero(cosecha.rendimientoTnHa)} t/ha` : '—',
      cosecha
        ? `Cosecha registrada el ${formatearFechaReporte(cosecha.fecha)}`
        : 'Sin cosecha con rendimiento en el período',
    ),
    filaMetrica(
      'Total gastado (pagado)',
      formatearMonedaBs(costos.gastado),
      'Gastos pagados vigentes en el período consultado',
    ),
    filaMetrica(
      'Total comprometido',
      formatearMonedaBs(costos.comprometido),
      'Compromisos de gasto pendientes de pago (aparte del gasto real)',
    ),
    filaMetrica(
      'Presupuesto de la campaña',
      formatearMonedaBs(costos.presupuesto),
      costos.presupuesto === null
        ? 'Sin presupuesto definido'
        : 'Presupuesto total planificado para toda la campaña',
    ),
    filaMetrica(
      'Ahorro (Presupuesto − Gastado)',
      formatearMonedaBs(costos.ahorro),
      costos.ahorro === null
        ? 'Requiere presupuesto definido'
        : costos.ahorro >= 0
          ? 'Dentro del presupuesto planificado'
          : 'Exceso respecto al presupuesto',
      ahorroPositivo,
    ),
    filaMetrica(
      'Costo por hectárea',
      formatearMonedaBs(costos.costoPorHa),
      `Calculado sobre ${formatearNumero(parcela.hectareas)} ha de la parcela`,
    ),
    filaMetrica(
      'Costo por tonelada',
      formatearMonedaBs(costos.costoPorTonelada),
      costos.costoPorTonelada === null
        ? 'Sin producción registrada en el período'
        : 'Gasto pagado dividido entre las toneladas cosechadas',
    ),
  ];

  return {
    table: {
      headerRows: 1,
      widths: ['34%', '22%', '44%'],
      body: filas,
    },
    layout: {
      fillColor: (indiceFila) => {
        if (indiceFila === 0) return VERDE_OSCURO;
        return indiceFila % 2 === 1 ? '#ffffff' : GRIS_FONDO;
      },
      hLineColor: () => GRIS_BORDE,
      vLineColor: () => GRIS_BORDE,
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
  };
}

function tablaActividades(reporte: ReporteCampanaDto): Content {
  if (reporte.actividades.length === 0) {
    return {
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: 'No hay actividades vigentes registradas en el período seleccionado.',
              color: TEXTO_SECUNDARIO,
              italics: true,
              margin: [8, 8, 8, 8],
            },
          ],
        ],
      },
      layout: {
        hLineColor: () => GRIS_BORDE,
        vLineColor: () => GRIS_BORDE,
        fillColor: () => GRIS_FONDO,
      },
    };
  }

  const filas: TableCell[][] = [
    [
      { text: '#', style: 'cabeceraTabla', alignment: 'center' },
      { text: 'Fecha', style: 'cabeceraTabla' },
      { text: 'Labor', style: 'cabeceraTabla' },
      { text: 'Descripción e insumos', style: 'cabeceraTabla' },
      { text: 'Responsable', style: 'cabeceraTabla' },
      { text: 'Rend.', style: 'cabeceraTabla', alignment: 'right' },
    ],
    ...reporte.actividades.map((actividad) => {
      const detalleInsumo = actividad.insumo
        ? `${actividad.insumo}${
            actividad.cantidad !== null
              ? ` · ${formatearNumero(actividad.cantidad)} ${actividad.unidad ?? ''}`.trimEnd()
              : ''
          }`
        : null;

      const descripcionStack: Content[] = [
        { text: actividad.descripcion, color: TEXTO_PRINCIPAL },
      ];
      if (detalleInsumo) {
        descripcionStack.push({
          text: `Insumo: ${detalleInsumo}`,
          fontSize: 8,
          color: TEXTO_SECUNDARIO,
          margin: [0, 2, 0, 0],
        });
      }
      if (actividad.correccionDeId) {
        descripcionStack.push({
          text: 'Registro de corrección de actividad previa',
          fontSize: 8,
          color: AMBAR_TEXTO,
          margin: [0, 2, 0, 0],
        });
      }

      const textoResponsable = actividad.tercerizado
        ? `${actividad.responsableNombre} (tercerizado)`
        : actividad.responsableNombre;

      return [
        { text: `#${actividad.secuencia}`, alignment: 'center', color: TEXTO_SECUNDARIO },
        { text: formatearFechaReporte(actividad.fecha) },
        { text: TIPO_ACTIVIDAD_ETIQUETA[actividad.tipo], bold: true },
        { stack: descripcionStack },
        { text: textoResponsable, color: TEXTO_SECUNDARIO },
        {
          text:
            actividad.rendimientoTnHa !== null
              ? `${formatearNumero(actividad.rendimientoTnHa)} t/ha`
              : '—',
          alignment: 'right',
          bold: actividad.rendimientoTnHa !== null,
          color: actividad.rendimientoTnHa !== null ? VERDE_OSCURO : TEXTO_SECUNDARIO,
        },
      ] satisfies TableCell[];
    }),
  ];

  return {
    table: {
      headerRows: 1,
      dontBreakRows: true,
      widths: [26, 58, 86, '*', 88, 52],
      body: filas,
    },
    layout: {
      fillColor: (indiceFila) => {
        if (indiceFila === 0) return VERDE_OSCURO;
        return indiceFila % 2 === 1 ? '#ffffff' : GRIS_FONDO;
      },
      hLineColor: () => GRIS_BORDE,
      vLineColor: () => GRIS_BORDE,
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
  };
}

export async function generarPdfReporteCampana(
  reporte: ReporteCampanaDto,
): Promise<Buffer> {
  const pdfMake = obtenerPdfMake();
  const alcanceTexto = reporte.periodo.porDefecto
    ? 'Campaña completa (sin filtro de fechas)'
    : 'Período personalizado (filtrado por fechas)';

  const contenido: Content[] = [
    {
      table: {
        widths: ['*', 'auto'],
        body: [
          [
            {
              stack: [
                {
                  text: 'AGRITRACK · REPORTE DE CAMPAÑA AGRÍCOLA',
                  color: '#a7f3d0',
                  fontSize: 8.5,
                  bold: true,
                },
                {
                  text: `${reporte.parcela.nombre} — ${reporte.cultivo.nombre}`,
                  color: '#ffffff',
                  fontSize: 16,
                  bold: true,
                  margin: [0, 3, 0, 2],
                },
                {
                  text: `Temporada ${reporte.campana.temporada}`,
                  color: '#ecfdf5',
                  fontSize: 10.5,
                },
              ],
              border: [false, false, false, false],
            },
            {
              stack: [
                {
                  text: 'ESTADO DE CAMPAÑA',
                  color: '#a7f3d0',
                  fontSize: 7.5,
                  bold: true,
                  alignment: 'right',
                },
                {
                  text: ESTADO_CAMPANA_ETIQUETA[reporte.campana.estado].toUpperCase(),
                  color: '#ffffff',
                  fontSize: 11,
                  bold: true,
                  alignment: 'right',
                  margin: [0, 3, 0, 0],
                },
              ],
              border: [false, false, false, false],
            },
          ],
        ],
      },
      layout: {
        fillColor: () => VERDE_OSCURO,
        paddingLeft: () => 14,
        paddingRight: () => 14,
        paddingTop: () => 12,
        paddingBottom: () => 12,
      },
    },

    encabezadoSeccion('1. Período del reporte'),
    {
      table: {
        widths: ['*', '*', '*'],
        body: [
          [
            bloqueDato(
              'Período consultado',
              `${formatearFechaReporte(reporte.periodo.desde)} al ${formatearFechaReporte(reporte.periodo.hasta)}`,
            ),
            bloqueDato('Alcance del reporte', alcanceTexto),
            bloqueDato(
              'Fecha de generación (Bolivia)',
              formatearFechaHoraBolivia(reporte.generadoEn),
            ),
          ],
        ],
      },
      layout: {
        fillColor: () => VERDE_SUAVE,
        hLineColor: () => VERDE_BORDE,
        vLineColor: () => VERDE_BORDE,
      },
    },

    encabezadoSeccion('2. Ficha técnica de la parcela y campaña'),
    {
      table: {
        widths: ['*', '*', '*'],
        body: [
          [
            bloqueDato('Parcela', reporte.parcela.nombre),
            bloqueDato('Superficie', `${formatearNumero(reporte.parcela.hectareas)} ha`),
            bloqueDato('Cultivo', reporte.cultivo.nombre),
          ],
          [
            bloqueDato('Ubicación', reporte.parcela.ubicacionTexto),
            bloqueDato('Temporada', reporte.campana.temporada),
            bloqueDato(
              'Fechas oficiales de campaña',
              `${formatearFechaReporte(reporte.campana.fechaInicio)} – ${
                reporte.campana.fechaFin
                  ? formatearFechaReporte(reporte.campana.fechaFin)
                  : 'En curso'
              }`,
            ),
          ],
        ],
      },
      layout: {
        hLineColor: () => GRIS_BORDE,
        vLineColor: () => GRIS_BORDE,
      },
    },

    encabezadoSeccion('3. Rendimiento y costos del período'),
    ...(reporte.periodo.porDefecto
      ? []
      : [
          {
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    text: 'Nota: Los gastos y actividades corresponden únicamente al período filtrado; el presupuesto corresponde a la campaña completa.',
                    color: AMBAR_TEXTO,
                    fontSize: 8.5,
                    margin: [6, 5, 6, 5],
                  },
                ],
              ],
            },
            layout: {
              fillColor: () => AMBAR_FONDO,
              hLineColor: () => '#fcd34d',
              vLineColor: () => '#fcd34d',
            },
            margin: [0, 0, 0, 8],
          } satisfies Content,
        ]),
    tablaCostos(reporte),

    encabezadoSeccion(
      `4. Actividades vigentes del período (${reporte.actividades.length})`,
    ),
    tablaActividades(reporte),
  ];

  const definicion: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [34, 34, 34, 42],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 9,
      color: TEXTO_PRINCIPAL,
    },
    styles: {
      tituloSeccion: {
        fontSize: 10,
        bold: true,
        color: VERDE_OSCURO,
      },
      etiqueta: {
        fontSize: 7.5,
        bold: true,
        color: TEXTO_SECUNDARIO,
      },
      valor: {
        fontSize: 9.5,
        bold: true,
        color: TEXTO_PRINCIPAL,
      },
      cabeceraTabla: {
        fontSize: 8.5,
        bold: true,
        color: '#ffffff',
      },
    },
    info: {
      title: `Reporte de campaña - ${reporte.parcela.nombre} (${reporte.campana.temporada})`,
      author: 'AgriTrack',
      subject: 'Reporte de campaña agrícola',
    },
    footer: (paginaActual, totalPaginas) => ({
      columns: [
        {
          text: 'AgriTrack · Reporte generado con trazabilidad de registros vigentes',
          color: TEXTO_SECUNDARIO,
          fontSize: 8,
        },
        {
          text: `Página ${paginaActual} de ${totalPaginas}`,
          alignment: 'right',
          color: TEXTO_SECUNDARIO,
          fontSize: 8,
        },
      ],
      margin: [34, 10, 34, 0],
    }),
    content: contenido,
  };

  const documento = pdfMake.createPdf(definicion);
  return documento.getBuffer();
}
