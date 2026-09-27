export class ParcelaEntity {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly hectareas: number,
    public readonly ubicacionTexto: string,
    public readonly lat: number | null,
    public readonly lng: number | null,
    public readonly disponibleParaPreventa: boolean,
    public readonly activa: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
