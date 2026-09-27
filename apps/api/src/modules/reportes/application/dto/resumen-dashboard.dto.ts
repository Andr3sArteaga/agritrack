import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HistoricoItemDto } from './historico-item.dto';

export class ProximaCosechaDto {
  @ApiProperty()
  campanaId: string;

  @ApiProperty()
  parcelaNombre: string;

  @ApiProperty()
  cultivoNombre: string;

  @ApiPropertyOptional()
  fechaFin: Date | null;
}

export class PrediccionProximaCampanaDto {
  @ApiProperty()
  campanaId: string;

  @ApiProperty()
  parcelaNombre: string;

  @ApiProperty()
  cultivoNombre: string;

  @ApiProperty()
  temporada: string;

  @ApiPropertyOptional()
  rendimientoEstimadoTnHa: number | null;

  @ApiProperty()
  campanasHistoricasUsadas: number;
}

export class ResumenDashboardDto {
  @ApiProperty()
  hectareasTotales: number;

  @ApiProperty()
  campanasEnCurso: number;

  @ApiProperty({ type: [ProximaCosechaDto] })
  proximasCosechas: ProximaCosechaDto[];

  @ApiPropertyOptional({ type: HistoricoItemDto })
  ultimaCosecha: HistoricoItemDto | null;

  @ApiProperty({ type: [HistoricoItemDto] })
  historicoRendimiento: HistoricoItemDto[];

  @ApiPropertyOptional({ type: PrediccionProximaCampanaDto })
  prediccionProximaCampana: PrediccionProximaCampanaDto | null;
}
