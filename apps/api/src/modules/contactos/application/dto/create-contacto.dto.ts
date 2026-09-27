import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoContacto } from '../../../../generated/prisma/enums';

export class CreateContactoDto {
  @ApiProperty({ enum: TipoContacto })
  @IsEnum(TipoContacto)
  tipo: TipoContacto;

  @ApiProperty({ example: 'Juan Perez' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: 'Transportes del Oriente' })
  @IsOptional()
  @IsString()
  empresa?: string;

  @ApiPropertyOptional({ example: '+591 70012345' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ example: 'juan@transportesoriente.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Prefiere coordinar por WhatsApp' })
  @IsOptional()
  @IsString()
  notas?: string;
}
