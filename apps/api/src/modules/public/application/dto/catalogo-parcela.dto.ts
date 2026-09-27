import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CatalogoParcelaDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  hectareas: number;

  @ApiPropertyOptional()
  cultivoActual: string | null;

  @ApiPropertyOptional({
    description: 'Produccion total estimada en toneladas (rendimiento t/ha x hectareas)',
  })
  produccionEstimadaTn: number | null;
}
