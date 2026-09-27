export class CultivoEntity {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
