import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TipoActividad } from '../../../../generated/prisma/enums';
import type {
  EfectoImpacto,
  EscenarioSiembraImpacto,
  EscenariosImpacto,
  FactorImpacto,
  OrigenDatos,
  ResultadoImpacto,
} from '../../domain/modelo-rendimiento';

export class ImpactoQueryDto {
  @ApiProperty({ description: 'Id del lote (parcela)' })
  @IsString()
  @IsNotEmpty()
  lote!: string;

  @ApiProperty({ description: 'Id de la campaña' })
  @IsString()
  @IsNotEmpty()
  campana!: string;

  @ApiPropertyOptional({ enum: TipoActividad })
  @IsOptional()
  @IsEnum(TipoActividad)
  tipoActividad?: TipoActividad;

  @ApiPropertyOptional({ example: 25.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  haSembradas?: number;

  @ApiPropertyOptional({ example: '2026-11-10' })
  @IsOptional()
  @ValidateIf((_, valor) => valor !== '')
  @IsDateString()
  fechaSiembra?: string;

  @ApiPropertyOptional({ example: '6410' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  variedad?: string;
}

export class FactorImpactoDto implements FactorImpacto {
  @ApiProperty({ enum: ['fecha_siembra', 'variedad', 'ha_sembradas'] })
  variable!: 'fecha_siembra' | 'variedad' | 'ha_sembradas';

  @ApiProperty() etiqueta!: string;
  @ApiProperty() valorIngresado!: string;

  @ApiProperty({ enum: ['POSITIVO', 'NEUTRO', 'NEGATIVO'] })
  efecto!: EfectoImpacto;

  @ApiProperty() delta_t_ha!: number;
  @ApiProperty() detalle!: string;
}

export class EscenarioSiembraDto implements EscenarioSiembraImpacto {
  @ApiProperty() haSembradas!: number;
  @ApiProperty() fechaSiembra!: string;
  @ApiProperty() variedad!: string;
  @ApiProperty() estimado_t_ha!: number;
  @ApiProperty() diferencia_t_ha!: number;
}

export class EscenariosImpactoDto implements EscenariosImpacto {
  @ApiProperty({ type: EscenarioSiembraDto, nullable: true })
  positivo!: EscenarioSiembraDto | null;

  @ApiProperty({ type: EscenarioSiembraDto, nullable: true })
  neutro!: EscenarioSiembraDto | null;

  @ApiProperty({ type: EscenarioSiembraDto, nullable: true })
  negativo!: EscenarioSiembraDto | null;
}

export class ImpactoResponseDto implements ResultadoImpacto {
  @ApiProperty({ enum: ['POSITIVO', 'NEUTRO', 'NEGATIVO'] })
  efectoGlobal!: EfectoImpacto;

  @ApiProperty() resumen!: string;
  @ApiProperty({ nullable: true }) estimado_t_ha!: number | null;
  @ApiProperty({ nullable: true }) referencia_t_ha!: number | null;
  @ApiProperty({ nullable: true }) diferencia_t_ha!: number | null;
  @ApiProperty({ nullable: true }) produccion_estimada_tn!: number | null;

  @ApiProperty({ enum: ['linea_base', 'mediana_modelo', 'sin_referencia'] })
  fuenteReferencia!: 'linea_base' | 'mediana_modelo' | 'sin_referencia';

  @ApiProperty({ nullable: true }) version_modelo!: string | null;

  @ApiProperty({ enum: ['demo_enmascarado', 'real'] })
  origen_datos!: OrigenDatos;

  @ApiProperty({ nullable: true }) etiqueta_datos!: string | null;
  @ApiProperty({ type: [String] }) variedadesConocidas!: string[];
  @ApiProperty({ type: [String] }) advertencias!: string[];
  @ApiProperty({ type: [FactorImpactoDto] }) factores!: FactorImpactoDto[];

  @ApiPropertyOptional({ type: EscenariosImpactoDto })
  escenarios?: EscenariosImpactoDto;
}

