import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { TipoInsumo } from '../../../../generated/prisma/enums';

export class ListarInsumosQueryDto {
  @ApiPropertyOptional({ enum: TipoInsumo })
  @IsOptional()
  @IsEnum(TipoInsumo)
  tipo?: TipoInsumo;

  @ApiPropertyOptional({ description: 'true = ocultar insumos descontinuados' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  soloActivos?: boolean;
}
