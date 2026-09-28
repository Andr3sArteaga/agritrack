import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ParcelaEntity,
  PoligonoGeoJson,
} from '../../domain/entities/parcela.entity';
import { PoligonoDto } from './poligono.dto';

export class ParcelaResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  hectareas: number;

  @ApiProperty()
  ubicacionTexto: string;

  @ApiPropertyOptional()
  lat: number | null;

  @ApiPropertyOptional()
  lng: number | null;

  @ApiProperty()
  disponibleParaPreventa: boolean;

  @ApiProperty()
  activa: boolean;

  @ApiPropertyOptional({ type: PoligonoDto, nullable: true })
  poligono: PoligonoGeoJson | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Advertencia de superposicion con otra parcela activa, si aplica',
  })
  advertencia?: string;

  static fromEntity(parcela: ParcelaEntity): ParcelaResponseDto {
    const dto = new ParcelaResponseDto();
    dto.id = parcela.id;
    dto.nombre = parcela.nombre;
    dto.hectareas = parcela.hectareas;
    dto.ubicacionTexto = parcela.ubicacionTexto;
    dto.lat = parcela.lat;
    dto.lng = parcela.lng;
    dto.disponibleParaPreventa = parcela.disponibleParaPreventa;
    dto.activa = parcela.activa;
    dto.poligono = parcela.poligono;
    dto.createdAt = parcela.createdAt;
    dto.updatedAt = parcela.updatedAt;
    return dto;
  }
}
