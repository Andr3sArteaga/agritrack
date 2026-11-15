import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import type { FotoParcelaItem } from '../../domain/repositories/parcela.repository';

export class CreateFotoParcelaDto {
  @ApiProperty({
    description: 'Imagen comprimida en formato Data URL base64 (JPEG, PNG o WebP)',
  })
  @IsString()
  @IsNotEmpty()
  imagenData!: string;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  descripcion?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  visibleEnPreventa?: boolean;
}

export class UpdateFotoParcelaDto {
  @ApiPropertyOptional({ nullable: true, maxLength: 160 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(160)
  descripcion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  visibleEnPreventa?: boolean;
}

export class FotoParcelaResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  parcelaId!: string;

  @ApiProperty()
  imagenData!: string;

  @ApiPropertyOptional({ nullable: true })
  descripcion!: string | null;

  @ApiProperty()
  visibleEnPreventa!: boolean;

  @ApiProperty()
  subidaPorId!: string;

  @ApiProperty()
  createdAt!: Date;

  static fromItem(item: FotoParcelaItem): FotoParcelaResponseDto {
    return { ...item };
  }
}
