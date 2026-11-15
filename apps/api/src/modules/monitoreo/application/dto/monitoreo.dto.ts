import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  CONDICIONES_CLIMA,
  type CondicionClima,
} from '../../domain/repositories/monitoreo.repository';

export class CrearAnalisisSueloDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  parcelaId!: string;

  @ApiProperty({ example: '2026-11-10', description: 'Fecha del analisis' })
  @IsDateString()
  fecha!: string;

  @ApiPropertyOptional({ example: 5.8, description: 'pH (0 a 14)' })
  @IsOptional()
  @IsNumber()
  ph?: number;

  @ApiPropertyOptional({ example: 18, description: 'Nitrogeno en ppm (mg/kg)' })
  @IsOptional()
  @IsNumber()
  nitrogeno?: number;

  @ApiPropertyOptional({ example: 12, description: 'Fosforo en ppm (mg/kg)' })
  @IsOptional()
  @IsNumber()
  fosforo?: number;

  @ApiPropertyOptional({ example: 140, description: 'Potasio en ppm (mg/kg)' })
  @IsOptional()
  @IsNumber()
  potasio?: number;

  @ApiPropertyOptional({ example: 2.4, description: 'Materia organica en %' })
  @IsOptional()
  @IsNumber()
  materiaOrganica?: number;

  @ApiPropertyOptional({ example: 22, description: 'Humedad del suelo en % (medida en campo)' })
  @IsOptional()
  @IsNumber()
  humedad?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;
}

export class CrearRegistroClimaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  parcelaId!: string;

  @ApiProperty({ example: '2026-11-14', description: 'Dia al que corresponde' })
  @IsDateString()
  fecha!: string;

  @ApiProperty({ enum: CONDICIONES_CLIMA })
  @IsIn(CONDICIONES_CLIMA)
  condicion!: CondicionClima;

  @ApiPropertyOptional({ example: 35, description: 'Milimetros de lluvia (solo si llovio)' })
  @IsOptional()
  @IsNumber()
  lluviaMm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;
}

export class ListarMonitoreoQueryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  parcelaId!: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Solo clima: desde esta fecha' })
  @IsOptional()
  @Type(() => String)
  @IsDateString()
  desde?: string;
}
