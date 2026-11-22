import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoActividad } from '../../../../generated/prisma/enums';
import { PoligonoGeoJson } from '../../../parcelas/domain/entities/parcela.entity';
import { PoligonoDto } from '../../../parcelas/application/dto/poligono.dto';

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

export class FotoPublicaParcelaDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'Ruta de la imagen en la API (GET)' })
  url: string;

  @ApiPropertyOptional({ nullable: true })
  descripcion: string | null;

  @ApiProperty()
  createdAt: Date;
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

  @ApiPropertyOptional({ type: PoligonoDto, nullable: true })
  poligono: PoligonoGeoJson | null;

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

  @ApiProperty({ description: 'Registros revisados; 0 = no hay nada que verificar' })
  registrosRevisados: number;

  @ApiProperty({ type: [FotoPublicaParcelaDto] })
  fotos: FotoPublicaParcelaDto[];

  @ApiProperty({ type: ContactoAgroAnDto })
  contacto: ContactoAgroAnDto;
}
