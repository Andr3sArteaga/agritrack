import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateInsumoDto } from './create-insumo.dto';

/**
 * El precio NO se edita aqui: el historial de precios es de solo agregado
 * (POST /insumos/:id/precios).
 */
export class UpdateInsumoDto extends PartialType(
  OmitType(CreateInsumoDto, ['precioInicial', 'vigenteDesde'] as const),
) {
  @ApiPropertyOptional({ description: 'false = insumo descontinuado' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
