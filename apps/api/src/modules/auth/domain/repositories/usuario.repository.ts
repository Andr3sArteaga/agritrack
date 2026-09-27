import { Rol } from '../../../../generated/prisma/enums';
import { UsuarioEntity } from '../entities/usuario.entity';

export const USUARIO_REPOSITORY = Symbol('USUARIO_REPOSITORY');

export interface CrearUsuarioData {
  nombre: string;
  email: string;
  passwordHash: string;
  rol: Rol;
}

export interface UsuarioRepository {
  findByEmail(email: string): Promise<UsuarioEntity | null>;
  findById(id: string): Promise<UsuarioEntity | null>;
  create(data: CrearUsuarioData): Promise<UsuarioEntity>;
}
