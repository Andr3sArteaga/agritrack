import { TipoContacto } from '../../../../generated/prisma/enums';

export class ContactoEntity {
  constructor(
    public readonly id: string,
    public readonly tipo: TipoContacto,
    public readonly nombre: string,
    public readonly empresa: string | null,
    public readonly telefono: string | null,
    public readonly email: string | null,
    public readonly notas: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
