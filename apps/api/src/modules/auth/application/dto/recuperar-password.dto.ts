import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RecuperarPasswordDto {
  @ApiProperty({ example: 'usuario@agroan.com' })
  @IsEmail()
  email: string;
}

export class RestablecerPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  nuevaPassword: string;
}
