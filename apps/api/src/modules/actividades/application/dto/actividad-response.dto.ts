import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoActividad } from '../../../../generated/prisma/enums';
import { ActividadEntity } from '../../domain/entities/actividad.entity';

export class ActividadResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  secuencia: number;

  @ApiProperty()
  campanaId: string;

  @ApiProperty({ enum: TipoActividad })
  tipo: TipoActividad;

  @ApiProperty()
  fecha: Date;

  @ApiProperty()
  descripcion: string;

  @ApiPropertyOptional()
  insumo: string | null;

  @ApiPropertyOptional()
  cantidad: number | null;

  @ApiPropertyOptional()
  unidad: string | null;

  @ApiProperty()
  responsableId: string;

  @ApiProperty()
  tercerizado: boolean;

  @ApiPropertyOptional()
  maquinariaUtilizada: string | null;

  @ApiPropertyOptional()
  rendimientoTnHa: number | null;

  @ApiPropertyOptional()
  correccionDeId: string | null;

  @ApiPropertyOptional()
  motivoCorreccion: string | null;

  @ApiProperty()
  hash: string;

  @ApiPropertyOptional()
  hashAnterior: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({
    description: 'false si otra actividad la corrigio (ya no es la vigente)',
  })
  vigente: boolean;

  static fromEntity(actividad: ActividadEntity): ActividadResponseDto {
    const dto = new ActividadResponseDto();
    dto.id = actividad.id;
    dto.secuencia = actividad.secuencia;
    dto.campanaId = actividad.campanaId;
    dto.tipo = actividad.tipo;
    dto.fecha = actividad.fecha;
    dto.descripcion = actividad.descripcion;
    dto.insumo = actividad.insumo;
    dto.cantidad = actividad.cantidad;
    dto.unidad = actividad.unidad;
    dto.responsableId = actividad.responsableId;
    dto.tercerizado = actividad.tercerizado;
    dto.maquinariaUtilizada = actividad.maquinariaUtilizada;
    dto.rendimientoTnHa = actividad.rendimientoTnHa;
    dto.correccionDeId = actividad.correccionDeId;
    dto.motivoCorreccion = actividad.motivoCorreccion;
    dto.hash = actividad.hash;
    dto.hashAnterior = actividad.hashAnterior;
    dto.createdAt = actividad.createdAt;
    dto.vigente = actividad.vigente;
    return dto;
  }
}
