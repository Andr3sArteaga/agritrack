import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  CategoriaGasto,
  EstadoGasto,
} from '../../../../generated/prisma/enums';
import { recortarTexto } from './recortar-texto';

/**
 * Un gasto no cambia de campana. En gastos de un insumo del catalogo el monto
 * y la categoria no se editan (el monto es cantidad x precio registrado): se
 * anula el gasto y se registra uno nuevo.
 */
export class UpdateGastoDto {
  @ApiPropertyOptional({ enum: CategoriaGasto })
  @IsOptional()
  @IsEnum(CategoriaGasto)
  categoria?: CategoriaGasto;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(recortarTexto)
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Monto en Bs' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monto?: number;

  @ApiPropertyOptional({ example: '2026-10-15' })
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @ApiPropertyOptional({ enum: EstadoGasto })
  @IsOptional()
  @IsEnum(EstadoGasto)
  estado?: EstadoGasto;
}
