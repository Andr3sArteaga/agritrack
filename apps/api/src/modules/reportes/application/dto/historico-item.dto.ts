import { ApiProperty } from '@nestjs/swagger';

export class HistoricoItemDto {
  @ApiProperty()
  campanaId: string;

  @ApiProperty()
  parcelaId: string;

  @ApiProperty()
  parcelaNombre: string;

  @ApiProperty()
  cultivoId: string;

  @ApiProperty()
  cultivoNombre: string;

  @ApiProperty()
  temporada: string;

  @ApiProperty()
  rendimientoTnHa: number;

  @ApiProperty()
  fecha: Date;
}
