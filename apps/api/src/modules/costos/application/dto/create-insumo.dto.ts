import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { TipoInsumo } from '../../../../generated/prisma/enums';
import { recortarTexto } from './recortar-texto';

export class CreateInsumoDto {
  @ApiProperty({ example: 'Semilla de soya' })
  @Transform(recortarTexto)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre: string;

  @ApiProperty({ enum: TipoInsumo, example: TipoInsumo.SEMILLA })
  @IsEnum(TipoInsumo)
  tipo: TipoInsumo;

  @ApiProperty({ example: 'kg', description: 'Unidad de medida (kg, L, ...)' })
  @Transform(recortarTexto)
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  unidad: string;

  @ApiProperty({ example: 9.5, description: 'Precio unitario inicial en Bs' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  precioInicial: number;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'Desde cuando rige el precio inicial (por defecto, hoy)',
  })
  @IsOptional()
  @IsDateString()
  vigenteDesde?: string;
}
