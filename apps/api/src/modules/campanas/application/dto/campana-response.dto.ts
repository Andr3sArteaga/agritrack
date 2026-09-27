import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoCampana } from '../../../../generated/prisma/enums';
import { CampanaEntity } from '../../domain/entities/campana.entity';

export class CampanaResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  parcelaId: string;

  @ApiProperty()
  cultivoId: string;

  @ApiProperty()
  temporada: string;

  @ApiProperty()
  fechaInicio: Date;

  @ApiPropertyOptional()
  fechaFin: Date | null;

  @ApiProperty({ enum: EstadoCampana })
  estado: EstadoCampana;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(campana: CampanaEntity): CampanaResponseDto {
    const dto = new CampanaResponseDto();
    dto.id = campana.id;
    dto.parcelaId = campana.parcelaId;
    dto.cultivoId = campana.cultivoId;
    dto.temporada = campana.temporada;
    dto.fechaInicio = campana.fechaInicio;
    dto.fechaFin = campana.fechaFin;
    dto.estado = campana.estado;
    dto.createdAt = campana.createdAt;
    dto.updatedAt = campana.updatedAt;
    return dto;
  }
}
