import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ListarGastosQueryDto {
  @ApiProperty({ description: 'Campana de la que se listan los gastos' })
  @IsString()
  @IsNotEmpty()
  campanaId: string;

  @ApiPropertyOptional({
    description: 'true = incluir tambien los gastos anulados',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  incluirAnulados?: boolean;
}
