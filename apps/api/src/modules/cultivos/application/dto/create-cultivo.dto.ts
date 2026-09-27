import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateCultivoDto {
  @ApiProperty({ example: 'Soya' })
  @IsString()
  nombre: string;
}
