import { TipoInsumo } from '../../../../generated/prisma/enums';

export class InsumoEntity {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly tipo: TipoInsumo,
    public readonly unidad: string,
    public readonly activo: boolean,
    public readonly precioVigente: number | null,
    public readonly precioVigenteDesde: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
