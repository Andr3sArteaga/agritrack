import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class CreatePrecioInsumoDto {
  @ApiProperty({ example: 10.2, description: 'Nuevo precio unitario en Bs' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  precio: number;

  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'Desde cuando rige (por defecto, hoy)',
  })
  @IsOptional()
  @IsDateString()
  vigenteDesde?: string;
}
