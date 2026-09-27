import { Rol } from '../../../../generated/prisma/enums';

export class UsuarioEntity {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly rol: Rol,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
