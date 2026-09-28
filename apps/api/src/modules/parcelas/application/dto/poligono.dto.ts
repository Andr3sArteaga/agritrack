import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn } from 'class-validator';

/**
 * GeoJSON Polygon simple (un solo anillo, sin huecos). La validacion
 * semantica real (vertices minimos, anillo cerrado, autointersecciones)
 * se hace en ParcelasService con turf, no aqui.
 */
export class PoligonoDto {
  @ApiProperty({ enum: ['Polygon'], example: 'Polygon' })
  @IsIn(['Polygon'])
  type: 'Polygon';

  @ApiProperty({
    description: 'Anillos de coordenadas [lng, lat]. Se espera un solo anillo.',
    example: [
      [
        [-62.5805, -17.7395],
        [-62.5795, -17.7395],
        [-62.5795, -17.7385],
        [-62.5805, -17.7385],
        [-62.5805, -17.7395],
      ],
    ],
  })
  @IsArray()
  coordinates: number[][][];
}
