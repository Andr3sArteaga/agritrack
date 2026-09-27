import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ParcelaEntity } from '../../domain/entities/parcela.entity';

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

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

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
    dto.createdAt = parcela.createdAt;
    dto.updatedAt = parcela.updatedAt;
    return dto;
  }
}
