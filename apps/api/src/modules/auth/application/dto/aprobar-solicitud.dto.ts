import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Rol } from '../../../../generated/prisma/enums';
import { UsuarioResponseDto } from './usuario-response.dto';

export class AprobarSolicitudDto {
  @ApiProperty({ enum: Rol, example: Rol.OPERATIVO })
  @IsEnum(Rol)
  rol: Rol;
}

export class AprobarSolicitudResponseDto {
  @ApiProperty({ type: UsuarioResponseDto })
  usuario: UsuarioResponseDto;

  @ApiProperty()
  correoEnviado: boolean;

  @ApiProperty()
  detalleCorreo: string;
}
