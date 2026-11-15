import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PresupuestoEntity } from '../../domain/entities/presupuesto.entity';

export class PresupuestoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  campanaId: string;

  @ApiProperty({ description: 'Presupuesto total en Bs' })
  montoTotal: number;

  @ApiPropertyOptional({ nullable: true })
  notas: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(presupuesto: PresupuestoEntity): PresupuestoResponseDto {
    const dto = new PresupuestoResponseDto();
    dto.id = presupuesto.id;
    dto.campanaId = presupuesto.campanaId;
    dto.montoTotal = presupuesto.montoTotal;
    dto.notas = presupuesto.notas;
    dto.createdAt = presupuesto.createdAt;
    dto.updatedAt = presupuesto.updatedAt;
    return dto;
  }
}
