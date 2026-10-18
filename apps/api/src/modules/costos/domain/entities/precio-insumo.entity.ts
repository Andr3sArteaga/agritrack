export class PrecioInsumoEntity {
  constructor(
    public readonly id: string,
    public readonly insumoId: string,
    public readonly precio: number,
    public readonly vigenteDesde: Date,
    public readonly createdAt: Date,
  ) {}
}
