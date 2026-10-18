import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { recortarTexto } from './recortar-texto';

export class UpsertPresupuestoDto {
  @ApiProperty({ example: 60000, description: 'Presupuesto total en Bs' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  montoTotal: number;

  @ApiPropertyOptional({ example: 'Aprobado en reunion de planificacion' })
  @IsOptional()
  @Transform(recortarTexto)
  @IsString()
  @MaxLength(500)
  notas?: string;
}
