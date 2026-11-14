import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EstimacionQueryDto {
  @ApiProperty({ description: 'Id del lote (parcela)' })
  @IsString()
  @IsNotEmpty()
  lote!: string;

  @ApiProperty({ description: 'Id de la campaña' })
  @IsString()
  @IsNotEmpty()
  campana!: string;
}

export class CultivoQueryDto {
  @ApiProperty({ description: 'Id del cultivo' })
  @IsString()
  @IsNotEmpty()
  cultivo!: string;
}

export class ModelosQueryDto {
  @ApiPropertyOptional({ description: 'Id del cultivo (sin el, todos)' })
  @IsOptional()
  @IsString()
  cultivo?: string;
}
