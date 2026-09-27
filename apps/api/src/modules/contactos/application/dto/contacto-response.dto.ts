import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoContacto } from '../../../../generated/prisma/enums';
import { ContactoEntity } from '../../domain/entities/contacto.entity';

export class ContactoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: TipoContacto })
  tipo: TipoContacto;

  @ApiProperty()
  nombre: string;

  @ApiPropertyOptional()
  empresa: string | null;

  @ApiPropertyOptional()
  telefono: string | null;

  @ApiPropertyOptional()
  email: string | null;

  @ApiPropertyOptional()
  notas: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(contacto: ContactoEntity): ContactoResponseDto {
    const dto = new ContactoResponseDto();
    dto.id = contacto.id;
    dto.tipo = contacto.tipo;
    dto.nombre = contacto.nombre;
    dto.empresa = contacto.empresa;
    dto.telefono = contacto.telefono;
    dto.email = contacto.email;
    dto.notas = contacto.notas;
    dto.createdAt = contacto.createdAt;
    dto.updatedAt = contacto.updatedAt;
    return dto;
  }
}
