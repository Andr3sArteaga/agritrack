import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { recortarTexto } from './recortar-texto';

export class AnularGastoDto {
  @ApiProperty({
    example: 'Registrado dos veces; ya existe el comprobante original.',
    description: 'Motivo obligatorio de la anulacion (RF-56)',
  })
  @Transform(recortarTexto)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  motivo: string;
}
