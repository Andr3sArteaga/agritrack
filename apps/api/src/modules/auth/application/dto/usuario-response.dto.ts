import { ApiProperty } from '@nestjs/swagger';
import { Rol } from '../../../../generated/prisma/enums';
import { UsuarioEntity } from '../../domain/entities/usuario.entity';

export class UsuarioResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: Rol })
  rol: Rol;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(usuario: UsuarioEntity): UsuarioResponseDto {
    const dto = new UsuarioResponseDto();
    dto.id = usuario.id;
    dto.nombre = usuario.nombre;
    dto.email = usuario.email;
    dto.rol = usuario.rol;
    dto.createdAt = usuario.createdAt;
    return dto;
  }
}
