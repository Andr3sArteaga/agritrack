import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EstadoCampana,
  TipoActividad,
} from '../../../../generated/prisma/enums';

export class PeriodoReporteDto {
  @ApiProperty({ description: 'Inicio del periodo consultado (inclusive)' })
  desde: Date;

  @ApiProperty({ description: 'Fin del periodo consultado (inclusive)' })
  hasta: Date;

  @ApiProperty({
    description: 'true si es el periodo completo de la campana (sin filtros)',
  })
  porDefecto: boolean;
}

export class CampanaReporteDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  temporada: string;

  @ApiProperty({ enum: EstadoCampana })
  estado: EstadoCampana;

  @ApiProperty()
  fechaInicio: Date;

  @ApiPropertyOptional({ nullable: true })
  fechaFin: Date | null;
}

export class ParcelaReporteDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  hectareas: number;

  @ApiProperty()
  ubicacionTexto: string;
}

export class CultivoReporteDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nombre: string;
}

export class ActividadReporteDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  secuencia: number;

  @ApiProperty({ enum: TipoActividad })
  tipo: TipoActividad;

  @ApiProperty()
  fecha: Date;

  @ApiProperty()
  descripcion: string;

  @ApiPropertyOptional({ nullable: true })
  insumo: string | null;

  @ApiPropertyOptional({ nullable: true })
  cantidad: number | null;

  @ApiPropertyOptional({ nullable: true })
  unidad: string | null;

  @ApiProperty()
  responsableNombre: string;

  @ApiProperty()
  tercerizado: boolean;

  @ApiPropertyOptional({ nullable: true })
  rendimientoTnHa: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Si es una correccion, id de la actividad que reemplaza',
  })
  correccionDeId: string | null;
}

export class CosechaReporteDto {
  @ApiProperty({ description: 'Rendimiento real en t/ha' })
  rendimientoTnHa: number;

  @ApiProperty()
  fecha: Date;
}

export class CostosReporteDto {
  @ApiProperty({ description: 'Gastos PAGADOS del periodo, en Bs' })
  gastado: number;

  @ApiProperty({ description: 'Gastos COMPROMETIDOS del periodo, en Bs' })
  comprometido: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Presupuesto total de la campana (no depende del periodo), en Bs',
  })
  presupuesto: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Presupuesto - gastado del periodo, en Bs',
  })
  ahorro: number | null;

  @ApiPropertyOptional({ nullable: true })
  costoPorHa: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'null si no hay cosecha con rendimiento en el periodo',
  })
  costoPorTonelada: number | null;
}

/** RF-42: reporte por campana con periodo consultado y fecha de generacion. */
export class ReporteCampanaDto {
  @ApiProperty({ type: PeriodoReporteDto })
  periodo: PeriodoReporteDto;

  @ApiProperty({ description: 'Momento en que se genero el reporte' })
  generadoEn: Date;

  @ApiProperty({ type: CampanaReporteDto })
  campana: CampanaReporteDto;

  @ApiProperty({ type: ParcelaReporteDto })
  parcela: ParcelaReporteDto;

  @ApiProperty({ type: CultivoReporteDto })
  cultivo: CultivoReporteDto;

  @ApiProperty({
    type: [ActividadReporteDto],
    description: 'Actividades vigentes del periodo, por fecha',
  })
  actividades: ActividadReporteDto[];

  @ApiPropertyOptional({
    type: CosechaReporteDto,
    nullable: true,
    description: 'Ultima cosecha vigente del periodo con rendimiento',
  })
  cosecha: CosechaReporteDto | null;

  @ApiProperty({ type: CostosReporteDto })
  costos: CostosReporteDto;
}
