import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, Matches } from 'class-validator';

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MENSAJE_FORMATO = 'debe tener formato AAAA-MM-DD';
const MENSAJE_FECHA = 'debe ser una fecha que exista';

/** RF-42: periodo consultado. Lo que se omite se toma de las fechas de la campana. */
export class ReporteCampanaQueryDto {
  @ApiPropertyOptional({
    example: '2026-06-01',
    description: 'Inicio del periodo (inclusive). Por defecto, inicio de la campana.',
  })
  @IsOptional()
  @Matches(FORMATO_FECHA, { message: `desde ${MENSAJE_FORMATO}` })
  @IsISO8601({ strict: true }, { message: `desde ${MENSAJE_FECHA}` })
  desde?: string;

  @ApiPropertyOptional({
    example: '2026-12-01',
    description:
      'Fin del periodo (inclusive). Por defecto, fin de la campana o hoy si aun no termino.',
  })
  @IsOptional()
  @Matches(FORMATO_FECHA, { message: `hasta ${MENSAJE_FORMATO}` })
  @IsISO8601({ strict: true }, { message: `hasta ${MENSAJE_FECHA}` })
  hasta?: string;
}
