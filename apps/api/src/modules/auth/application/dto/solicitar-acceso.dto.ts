import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SolicitarAccesoDto {
  @ApiProperty({ example: 'Carlos' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Mendoza' })
  @IsString()
  @IsNotEmpty()
  apellido: string;

  @ApiProperty({ example: 'carlos@agroan.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+591 71234567' })
  @IsString()
  @IsNotEmpty()
  telefono: string;

  @ApiProperty({ example: 'ClaveSegura123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
