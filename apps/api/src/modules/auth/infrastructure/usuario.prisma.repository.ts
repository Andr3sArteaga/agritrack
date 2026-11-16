import { Injectable } from '@nestjs/common';
import type { Usuario as UsuarioModel } from '../../../generated/prisma/client';
import { EstadoUsuario, Rol } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { UsuarioEntity } from '../domain/entities/usuario.entity';
import {
  ActualizarPerfilData,
  CrearUsuarioData,
  UsuarioRepository,
} from '../domain/repositories/usuario.repository';

@Injectable()
export class UsuarioPrismaRepository implements UsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UsuarioEntity | null> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
    });
    return usuario ? this.toEntity(usuario) : null;
  }

  async findById(id: string): Promise<UsuarioEntity | null> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    return usuario ? this.toEntity(usuario) : null;
  }

  async findPendientes(): Promise<UsuarioEntity[]> {
    const usuarios = await this.prisma.usuario.findMany({
      where: { estado: EstadoUsuario.PENDIENTE },
      orderBy: { createdAt: 'desc' },
    });
    return usuarios.map((u) => this.toEntity(u));
  }

  async create(data: CrearUsuarioData): Promise<UsuarioEntity> {
    const usuario = await this.prisma.usuario.create({ data });
    return this.toEntity(usuario);
  }

  async aprobar(id: string, rol: Rol): Promise<UsuarioEntity> {
    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: { estado: EstadoUsuario.ACTIVO, rol },
    });
    return this.toEntity(usuario);
  }

  async actualizarPerfil(
    id: string,
    data: ActualizarPerfilData,
  ): Promise<UsuarioEntity> {
    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
        ...(data.apellido !== undefined ? { apellido: data.apellido } : {}),
        ...(data.telefono !== undefined ? { telefono: data.telefono } : {}),
      },
    });
    return this.toEntity(usuario);
  }

  async actualizarPassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id },
      data: { passwordHash },
    });
  }

  private toEntity(usuario: UsuarioModel): UsuarioEntity {
    return new UsuarioEntity(
      usuario.id,
      usuario.nombre,
      usuario.email,
      usuario.passwordHash,
      usuario.rol,
      usuario.createdAt,
      usuario.updatedAt,
      usuario.apellido,
      usuario.telefono,
      usuario.estado,
    );
  }
}
