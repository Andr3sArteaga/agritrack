import { Injectable, NotFoundException } from '@nestjs/common';
import type { Contacto as ContactoModel } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ContactoEntity } from '../domain/entities/contacto.entity';
import {
  ActualizarContactoData,
  ContactoRepository,
  CrearContactoData,
  FiltrosContacto,
} from '../domain/repositories/contacto.repository';

@Injectable()
export class ContactoPrismaRepository implements ContactoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filtros?: FiltrosContacto): Promise<ContactoEntity[]> {
    const contactos = await this.prisma.contacto.findMany({
      where: {
        tipo: filtros?.tipo,
        ...(filtros?.search
          ? {
              OR: [
                { nombre: { contains: filtros.search, mode: 'insensitive' } },
                {
                  empresa: { contains: filtros.search, mode: 'insensitive' },
                },
                {
                  telefono: { contains: filtros.search, mode: 'insensitive' },
                },
                { email: { contains: filtros.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { nombre: 'asc' },
    });
    return contactos.map((contacto) => this.toEntity(contacto));
  }

  async findById(id: string): Promise<ContactoEntity | null> {
    const contacto = await this.prisma.contacto.findUnique({ where: { id } });
    return contacto ? this.toEntity(contacto) : null;
  }

  async create(data: CrearContactoData): Promise<ContactoEntity> {
    const contacto = await this.prisma.contacto.create({ data });
    return this.toEntity(contacto);
  }

  async update(
    id: string,
    data: ActualizarContactoData,
  ): Promise<ContactoEntity> {
    try {
      const contacto = await this.prisma.contacto.update({
        where: { id },
        data,
      });
      return this.toEntity(contacto);
    } catch {
      throw new NotFoundException('Contacto no encontrado');
    }
  }

  private toEntity(contacto: ContactoModel): ContactoEntity {
    return new ContactoEntity(
      contacto.id,
      contacto.tipo,
      contacto.nombre,
      contacto.empresa,
      contacto.telefono,
      contacto.email,
      contacto.notas,
      contacto.createdAt,
      contacto.updatedAt,
    );
  }
}
