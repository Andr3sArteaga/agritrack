import { Injectable } from '@nestjs/common';
import type { Usuario as UsuarioModel } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { UsuarioEntity } from '../domain/entities/usuario.entity';
import {
  CrearUsuarioData,
  UsuarioRepository,
} from '../domain/repositories/usuario.repository';

@Injectable()
export class UsuarioPrismaRepository implements UsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UsuarioEntity | null> {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    return usuario ? this.toEntity(usuario) : null;
  }

  async findById(id: string): Promise<UsuarioEntity | null> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    return usuario ? this.toEntity(usuario) : null;
  }

  async create(data: CrearUsuarioData): Promise<UsuarioEntity> {
    const usuario = await this.prisma.usuario.create({ data });
    return this.toEntity(usuario);
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
    );
  }
}
