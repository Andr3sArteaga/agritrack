import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';
import { TipoActividad } from '../../../../generated/prisma/enums';

export class CreateActividadDto {
  @ApiProperty()
  @IsString()
  campanaId: string;

  @ApiProperty({ enum: TipoActividad })
  @IsEnum(TipoActividad)
  tipo: TipoActividad;

  @ApiProperty({ example: '2025-11-05' })
  @IsDateString()
  fecha: string;

  @ApiProperty({ example: 'Siembra de soya en surcos a 45cm' })
  @IsString()
  descripcion: string;

  @ApiPropertyOptional({ example: 'Semilla certificada' })
  @IsOptional()
  @IsString()
  insumo?: string;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  cantidad?: number;

  @ApiPropertyOptional({ example: 'kg/ha' })
  @IsOptional()
  @IsString()
  unidad?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  tercerizado?: boolean;

  @ApiPropertyOptional({ example: 'Sembradora John Deere 1990' })
  @IsOptional()
  @IsString()
  maquinariaUtilizada?: string;

  @ApiPropertyOptional({
    example: 3.2,
    description: 'Obligatorio cuando tipo = COSECHA',
  })
  @ValidateIf((dto: CreateActividadDto) => dto.tipo === TipoActividad.COSECHA)
  @IsNumber()
  @IsPositive()
  rendimientoTnHa?: number;

  @ApiPropertyOptional({
    description: 'Id de la actividad que esta corrigiendo, si aplica',
  })
  @IsOptional()
  @IsString()
  correccionDeId?: string;

  @ApiPropertyOptional({
    description: 'Obligatorio cuando correccionDeId esta presente',
  })
  @ValidateIf((dto: CreateActividadDto) => !!dto.correccionDeId)
  @IsString()
  motivoCorreccion?: string;
}
