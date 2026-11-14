import { ApiProperty } from '@nestjs/swagger';
import type { OrigenDatos } from '../../domain/modelo-rendimiento';
import type { EstimacionRendimiento } from '../../domain/ports/estimador-rendimiento.port';

export class EstimacionDto implements EstimacionRendimiento {
  @ApiProperty({ nullable: true, description: 't/ha; null = sin datos' })
  valor_t_ha!: number | null;

  @ApiProperty({ enum: ['linea_base', 'modelo'] })
  fuente!: 'linea_base' | 'modelo';

  @ApiProperty({ enum: ['oficial', 'experimental'] })
  estado!: 'oficial' | 'experimental';

  @ApiProperty({ nullable: true, example: 'v1' })
  version_modelo!: string | null;

  @ApiProperty()
  campañas_usadas!: number;

  @ApiProperty({ type: [String] })
  advertencias!: string[];
}

export class EstimacionResponseDto {
  @ApiProperty({ type: EstimacionDto, description: 'Estimacion oficial (hoy: linea base)' })
  oficial!: EstimacionRendimiento;

  @ApiProperty({ type: EstimacionDto, nullable: true, description: 'Modelo no activo' })
  experimental!: EstimacionRendimiento | null;

  @ApiProperty({
    type: EstimacionDto,
    nullable: true,
    description: 'Linea base, solo cuando el modelo activo es la estimacion oficial',
  })
  referencia_linea_base!: EstimacionRendimiento | null;

  @ApiProperty({ enum: ['demo_enmascarado', 'real'] })
  origen_datos!: OrigenDatos;

  @ApiProperty({ nullable: true, example: 'Datos de demostración (enmascarados)' })
  etiqueta_datos!: string | null;
}
