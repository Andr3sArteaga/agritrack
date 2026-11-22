import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PoligonoGeoJson } from '../../../parcelas/domain/entities/parcela.entity';
import { PoligonoDto } from '../../../parcelas/application/dto/poligono.dto';

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

  @ApiPropertyOptional({
    nullable: true,
    description: 'Ruta en la API de la primera foto visible en preventa',
  })
  fotoPortada: string | null;

  @ApiProperty({
    description: 'Cantidad de fotos publicadas para preventa',
  })
  totalFotosPublicadas: number;

  @ApiPropertyOptional()
  ubicacionTexto?: string;

  @ApiPropertyOptional({ nullable: true })
  temporadaActual?: string | null;

  @ApiPropertyOptional({ nullable: true })
  rendimientoEstimadoTnHa?: number | null;

  @ApiPropertyOptional({ type: PoligonoDto, nullable: true })
  poligono?: PoligonoGeoJson | null;
}
