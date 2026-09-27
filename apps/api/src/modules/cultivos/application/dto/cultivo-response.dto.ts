import { ApiProperty } from '@nestjs/swagger';
import { CultivoEntity } from '../../domain/entities/cultivo.entity';

export class CultivoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(cultivo: CultivoEntity): CultivoResponseDto {
    const dto = new CultivoResponseDto();
    dto.id = cultivo.id;
    dto.nombre = cultivo.nombre;
    dto.createdAt = cultivo.createdAt;
    return dto;
  }
}
