import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { CreateParcelaDto } from './create-parcela.dto';
import { PoligonoDto } from './poligono.dto';

export class UpdateParcelaDto extends PartialType(
  OmitType(CreateParcelaDto, ['poligono'] as const),
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  @ApiPropertyOptional({
    type: PoligonoDto,
    nullable: true,
    description: 'Enviar null para quitar el poligono de la parcela.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PoligonoDto)
  poligono?: PoligonoDto | null;
}
