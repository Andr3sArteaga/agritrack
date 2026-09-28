import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PoligonoDto } from './poligono.dto';

export class CreateParcelaDto {
  @ApiProperty({ example: 'Parcela El Ceibo' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 25.5 })
  @IsNumber()
  @IsPositive()
  hectareas: number;

  @ApiProperty({ example: 'Km 12 carretera a Montero, Santa Cruz' })
  @IsString()
  ubicacionTexto: string;

  @ApiPropertyOptional({ example: -17.7833 })
  @IsOptional()
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ example: -63.1821 })
  @IsOptional()
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  disponibleParaPreventa?: boolean;

  @ApiPropertyOptional({
    type: PoligonoDto,
    description:
      'GeoJSON Polygon del contorno de la parcela. Si se envia, las hectareas se recalculan en el backend y se ignora el valor de "hectareas" enviado.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PoligonoDto)
  poligono?: PoligonoDto;
}
