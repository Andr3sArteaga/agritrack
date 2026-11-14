import { ApiProperty } from '@nestjs/swagger';
import type {
  EstadoModelo,
  MetricasModelo,
  ModeloIa,
  OrigenDatos,
} from '../../domain/modelo-rendimiento';

/** Version de un modelo, sin el modelo serializado. */
export class ModeloIaResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() cultivoId!: string;
  @ApiProperty({ example: 'v1' }) version!: string;
  @ApiProperty() fecha!: Date;
  @ApiProperty({ enum: ['demo_enmascarado', 'real'] }) origenDatos!: OrigenDatos;
  @ApiProperty({ type: [String] }) campanasUsadas!: string[];
  @ApiProperty() hashDatos!: string;
  @ApiProperty({ type: [String] }) predictores!: string[];
  @ApiProperty({ type: [String] }) categoriasVariedad!: string[];
  @ApiProperty({ nullable: true }) medianaDiasSiembra!: number | null;
  @ApiProperty({ type: Object }) metricas!: MetricasModelo;
  @ApiProperty({ enum: ['experimental', 'activo', 'archivado'] }) estado!: EstadoModelo;

  static fromDomain(modelo: ModeloIa): ModeloIaResponseDto {
    return {
      id: modelo.id,
      cultivoId: modelo.cultivoId,
      version: `v${modelo.version}`,
      fecha: modelo.createdAt,
      origenDatos: modelo.origenDatos,
      campanasUsadas: modelo.campanasUsadas,
      hashDatos: modelo.hashDatos,
      predictores: modelo.codificador.columnas,
      categoriasVariedad: modelo.codificador.categoriasVariedad,
      medianaDiasSiembra: modelo.codificador.medianaDiasSiembra,
      metricas: modelo.metricas,
      estado: modelo.estado,
    };
  }
}
