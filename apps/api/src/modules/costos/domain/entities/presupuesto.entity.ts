export class PresupuestoEntity {
  constructor(
    public readonly id: string,
    public readonly campanaId: string,
    public readonly montoTotal: number,
    public readonly notas: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
