import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoActividad } from '../../../../generated/prisma/enums';

export class TimelineItemDto {
  @ApiProperty({ enum: TipoActividad })
  tipo: TipoActividad;

  @ApiProperty()
  fecha: Date;

  @ApiProperty()
  descripcion: string;
}

export class HistoricoPublicoItemDto {
  @ApiProperty()
  temporada: string;

  @ApiProperty()
  rendimientoTnHa: number;

  @ApiProperty()
  fecha: Date;
}

export class ContactoAgroAnDto {
  @ApiPropertyOptional()
  nombre: string | null;

  @ApiPropertyOptional()
  telefono: string | null;

  @ApiPropertyOptional()
  email: string | null;
}

export class DetalleParcelaPublicoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  hectareas: number;

  @ApiProperty()
  ubicacionTexto: string;

  @ApiPropertyOptional()
  cultivoActual: string | null;

  @ApiPropertyOptional()
  temporadaActual: string | null;

  @ApiPropertyOptional()
  rendimientoEstimadoTnHa: number | null;

  @ApiPropertyOptional()
  produccionEstimadaTotalTn: number | null;

  @ApiProperty({ type: [TimelineItemDto] })
  historialCuidado: TimelineItemDto[];

  @ApiProperty({ type: [HistoricoPublicoItemDto] })
  historicoRendimiento: HistoricoPublicoItemDto[];

  @ApiProperty()
  registrosVerificados: boolean;

  @ApiProperty({ type: ContactoAgroAnDto })
  contacto: ContactoAgroAnDto;
}
