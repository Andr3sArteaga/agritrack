import { TipoActividad } from '../../../../generated/prisma/enums';

export class ActividadEntity {
  constructor(
    public readonly id: string,
    public readonly secuencia: number,
    public readonly campanaId: string,
    public readonly tipo: TipoActividad,
    public readonly fecha: Date,
    public readonly descripcion: string,
    public readonly insumo: string | null,
    public readonly cantidad: number | null,
    public readonly unidad: string | null,
    public readonly responsableId: string,
    public readonly tercerizado: boolean,
    public readonly maquinariaUtilizada: string | null,
    public readonly rendimientoTnHa: number | null,
    public readonly correccionDeId: string | null,
    public readonly motivoCorreccion: string | null,
    public readonly hash: string,
    public readonly hashAnterior: string | null,
    public readonly createdAt: Date,
    public readonly vigente: boolean,
  ) {}
}
