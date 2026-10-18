import {
  CategoriaGasto,
  EstadoGasto,
} from '../../../../generated/prisma/enums';

export class GastoEntity {
  constructor(
    public readonly id: string,
    public readonly campanaId: string,
    public readonly categoria: CategoriaGasto,
    public readonly descripcion: string,
    public readonly monto: number,
    public readonly fecha: Date,
    public readonly estado: EstadoGasto,
    public readonly insumoId: string | null,
    public readonly cantidad: number | null,
    public readonly precioUnitario: number | null,
    public readonly registradoPorId: string,
    public readonly anulado: boolean,
    public readonly motivoAnulacion: string | null,
    public readonly anuladoEn: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
