import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { EstadoCampana } from '../../../../generated/prisma/enums';

export class CreateCampanaDto {
  @ApiProperty()
  @IsString()
  parcelaId: string;

  @ApiProperty()
  @IsString()
  cultivoId: string;

  @ApiProperty({ example: 'Verano 2025' })
  @IsString()
  temporada: string;

  @ApiProperty({ example: '2025-11-01' })
  @IsDateString()
  fechaInicio: string;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @ApiPropertyOptional({ enum: EstadoCampana, default: EstadoCampana.PLANIFICADA })
  @IsOptional()
  @IsEnum(EstadoCampana)
  estado?: EstadoCampana;
}
