import { ApiProperty } from '@nestjs/swagger';
import { PrecioInsumoEntity } from '../../domain/entities/precio-insumo.entity';

export class PrecioInsumoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  insumoId: string;

  @ApiProperty({ description: 'Precio unitario en Bs' })
  precio: number;

  @ApiProperty()
  vigenteDesde: Date;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(precio: PrecioInsumoEntity): PrecioInsumoResponseDto {
    const dto = new PrecioInsumoResponseDto();
    dto.id = precio.id;
    dto.insumoId = precio.insumoId;
    dto.precio = precio.precio;
    dto.vigenteDesde = precio.vigenteDesde;
    dto.createdAt = precio.createdAt;
    return dto;
  }
}
