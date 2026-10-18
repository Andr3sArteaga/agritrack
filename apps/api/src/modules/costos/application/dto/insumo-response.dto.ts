import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoInsumo } from '../../../../generated/prisma/enums';
import { InsumoEntity } from '../../domain/entities/insumo.entity';

export class InsumoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty({ enum: TipoInsumo })
  tipo: TipoInsumo;

  @ApiProperty()
  unidad: string;

  @ApiProperty()
  activo: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Precio unitario vigente hoy, en Bs (null si aun no rige ninguno)',
  })
  precioVigente: number | null;

  @ApiPropertyOptional({ nullable: true })
  precioVigenteDesde: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(insumo: InsumoEntity): InsumoResponseDto {
    const dto = new InsumoResponseDto();
    dto.id = insumo.id;
    dto.nombre = insumo.nombre;
    dto.tipo = insumo.tipo;
    dto.unidad = insumo.unidad;
    dto.activo = insumo.activo;
    dto.precioVigente = insumo.precioVigente;
    dto.precioVigenteDesde = insumo.precioVigenteDesde;
    dto.createdAt = insumo.createdAt;
    dto.updatedAt = insumo.updatedAt;
    return dto;
  }
}
