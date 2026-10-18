import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CategoriaGasto,
  EstadoGasto,
} from '../../../../generated/prisma/enums';
import { GastoEntity } from '../../domain/entities/gasto.entity';

export class GastoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  campanaId: string;

  @ApiProperty({ enum: CategoriaGasto })
  categoria: CategoriaGasto;

  @ApiProperty()
  descripcion: string;

  @ApiProperty({ description: 'Monto en Bs' })
  monto: number;

  @ApiProperty()
  fecha: Date;

  @ApiProperty({ enum: EstadoGasto })
  estado: EstadoGasto;

  @ApiPropertyOptional({ nullable: true })
  insumoId: string | null;

  @ApiPropertyOptional({ nullable: true })
  cantidad: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Precio unitario vigente al registrar (Bs)',
  })
  precioUnitario: number | null;

  @ApiProperty()
  registradoPorId: string;

  @ApiProperty({ description: 'Los gastos anulados no cuentan en los totales' })
  anulado: boolean;

  @ApiPropertyOptional({ nullable: true })
  motivoAnulacion: string | null;

  @ApiPropertyOptional({ nullable: true })
  anuladoEn: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(gasto: GastoEntity): GastoResponseDto {
    const dto = new GastoResponseDto();
    dto.id = gasto.id;
    dto.campanaId = gasto.campanaId;
    dto.categoria = gasto.categoria;
    dto.descripcion = gasto.descripcion;
    dto.monto = gasto.monto;
    dto.fecha = gasto.fecha;
    dto.estado = gasto.estado;
    dto.insumoId = gasto.insumoId;
    dto.cantidad = gasto.cantidad;
    dto.precioUnitario = gasto.precioUnitario;
    dto.registradoPorId = gasto.registradoPorId;
    dto.anulado = gasto.anulado;
    dto.motivoAnulacion = gasto.motivoAnulacion;
    dto.anuladoEn = gasto.anuladoEn;
    dto.createdAt = gasto.createdAt;
    dto.updatedAt = gasto.updatedAt;
    return dto;
  }
}
