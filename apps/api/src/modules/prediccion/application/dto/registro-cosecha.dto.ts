import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import type { OrigenDatos, RegistroCosechaCampana } from '../../domain/modelo-rendimiento';

export class GuardarRegistroCosechaDto {
  @ApiPropertyOptional({ example: 25.5, description: 'Hectáreas sembradas' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  haSembradas?: number;

  @ApiPropertyOptional({ example: '6410', nullable: true })
  @IsOptional()
  @ValidateIf((_, valor) => valor !== null)
  @IsString()
  @MaxLength(100)
  variedad?: string | null;

  @ApiPropertyOptional({ example: '2026-11-10', nullable: true })
  @IsOptional()
  @ValidateIf((_, valor) => valor !== null && valor !== '')
  @IsDateString()
  fechaSiembra?: string | null;

  @ApiPropertyOptional({ example: 25.5, description: 'Hectáreas cosechadas' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  haCosechadas?: number;

  @ApiPropertyOptional({ example: 52.3, description: 'Toneladas totales cosechadas' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  toneladas?: number;

  @ApiPropertyOptional({ example: '2027-03-10' })
  @IsOptional()
  @IsDateString()
  fechaCosecha?: string;
}

export class RegistroCosechaResponseDto implements RegistroCosechaCampana {
  @ApiProperty() id!: string;
  @ApiProperty() campanaId!: string;
  @ApiProperty({ nullable: true }) variedad!: string | null;
  @ApiProperty({ nullable: true }) fechaSiembra!: Date | null;
  @ApiProperty() haSembradas!: number;
  @ApiProperty({ nullable: true }) fechaCosecha!: Date | null;
  @ApiProperty({ nullable: true }) haCosechadas!: number | null;
  @ApiProperty({ nullable: true }) toneladas!: number | null;
  @ApiProperty({ enum: ['demo_enmascarado', 'real'] }) origen!: OrigenDatos;
  @ApiProperty() updatedAt!: Date;
}
