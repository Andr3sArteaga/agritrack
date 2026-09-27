import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Rol } from '../../../../generated/prisma/enums';

export class RegisterDto {
  @ApiProperty({ example: 'Ana Perez' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'ana@agroan.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'contraseña123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: Rol, example: Rol.OPERATIVO })
  @IsEnum(Rol)
  rol: Rol;
}
