import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoUsuario, Rol } from '../../../../generated/prisma/enums';
import { UsuarioEntity } from '../../domain/entities/usuario.entity';

export class UsuarioResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nombre: string;

  @ApiPropertyOptional({ nullable: true })
  apellido: string | null;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional({ nullable: true })
  telefono: string | null;

  @ApiProperty({ enum: Rol })
  rol: Rol;

  @ApiProperty({ enum: EstadoUsuario })
  estado: EstadoUsuario;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(usuario: UsuarioEntity): UsuarioResponseDto {
    const dto = new UsuarioResponseDto();
    dto.id = usuario.id;
    dto.nombre = usuario.nombre;
    dto.apellido = usuario.apellido;
    dto.email = usuario.email;
    dto.telefono = usuario.telefono;
    dto.rol = usuario.rol;
    dto.estado = usuario.estado;
    dto.createdAt = usuario.createdAt;
    return dto;
  }
}
