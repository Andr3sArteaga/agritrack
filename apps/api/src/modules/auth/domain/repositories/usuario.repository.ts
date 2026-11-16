import { EstadoUsuario, Rol } from '../../../../generated/prisma/enums';
import { UsuarioEntity } from '../entities/usuario.entity';

export const USUARIO_REPOSITORY = Symbol('USUARIO_REPOSITORY');

export interface CrearUsuarioData {
  nombre: string;
  apellido?: string | null;
  email: string;
  telefono?: string | null;
  passwordHash: string;
  rol: Rol;
  estado?: EstadoUsuario;
}

export interface ActualizarPerfilData {
  nombre?: string;
  apellido?: string | null;
  telefono?: string | null;
}

export interface UsuarioRepository {
  findByEmail(email: string): Promise<UsuarioEntity | null>;
  findById(id: string): Promise<UsuarioEntity | null>;
  findPendientes(): Promise<UsuarioEntity[]>;
  create(data: CrearUsuarioData): Promise<UsuarioEntity>;
  aprobar(id: string, rol: Rol): Promise<UsuarioEntity>;
  actualizarPerfil(
    id: string,
    data: ActualizarPerfilData,
  ): Promise<UsuarioEntity>;
  actualizarPassword(id: string, passwordHash: string): Promise<void>;
}
