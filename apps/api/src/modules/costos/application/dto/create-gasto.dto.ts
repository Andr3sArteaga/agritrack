import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  CategoriaGasto,
  EstadoGasto,
} from '../../../../generated/prisma/enums';
import { recortarTexto } from './recortar-texto';

export class CreateGastoDto {
  @ApiProperty()
  @IsString()
  campanaId: string;

  @ApiProperty({ enum: CategoriaGasto, example: CategoriaGasto.MAQUINARIA })
  @IsEnum(CategoriaGasto)
  categoria: CategoriaGasto;

  @ApiProperty({ example: 'Alquiler de cosechadora' })
  @Transform(recortarTexto)
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  descripcion: string;

  @ApiProperty({ example: '2026-10-15' })
  @IsDateString()
  fecha: string;

  @ApiProperty({ enum: EstadoGasto, example: EstadoGasto.PAGADO })
  @IsEnum(EstadoGasto)
  estado: EstadoGasto;

  @ApiPropertyOptional({
    example: 4500,
    description:
      'Monto en Bs. Obligatorio salvo que se indique insumoId: entonces se calcula cantidad x precio vigente y este valor se ignora.',
  })
  @ValidateIf((dto: CreateGastoDto) => !dto.insumoId)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monto?: number;

  @ApiPropertyOptional({
    description:
      'Insumo del catalogo. Exige categoria INSUMOS y cantidad; el monto lo calcula el backend.',
  })
  @IsOptional()
  @IsString()
  insumoId?: string;

  @ApiPropertyOptional({
    example: 1500,
    description: 'Cantidad del insumo (obligatoria si se envia insumoId)',
  })
  @ValidateIf(
    (dto: CreateGastoDto) => !!dto.insumoId || dto.cantidad !== undefined,
  )
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  cantidad?: number;
}
