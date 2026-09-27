import { EstadoCampana } from '../../../../generated/prisma/enums';

export class CampanaEntity {
  constructor(
    public readonly id: string,
    public readonly parcelaId: string,
    public readonly cultivoId: string,
    public readonly temporada: string,
    public readonly fechaInicio: Date,
    public readonly fechaFin: Date | null,
    public readonly estado: EstadoCampana,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
