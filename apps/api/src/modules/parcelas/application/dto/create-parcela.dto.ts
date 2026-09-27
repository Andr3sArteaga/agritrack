import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateParcelaDto {
  @ApiProperty({ example: 'Parcela El Ceibo' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 25.5 })
  @IsNumber()
  @IsPositive()
  hectareas: number;

  @ApiProperty({ example: 'Km 12 carretera a Montero, Santa Cruz' })
  @IsString()
  ubicacionTexto: string;

  @ApiPropertyOptional({ example: -17.7833 })
  @IsOptional()
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ example: -63.1821 })
  @IsOptional()
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  disponibleParaPreventa?: boolean;
}
