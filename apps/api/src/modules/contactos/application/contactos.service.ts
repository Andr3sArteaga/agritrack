import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TipoContacto } from '../../../generated/prisma/enums';
import {
  CONTACTO_REPOSITORY,
  type ContactoRepository,
} from '../domain/repositories/contacto.repository';
import { ContactoResponseDto } from './dto/contacto-response.dto';
import { CreateContactoDto } from './dto/create-contacto.dto';
import { UpdateContactoDto } from './dto/update-contacto.dto';

@Injectable()
export class ContactosService {
  constructor(
    @Inject(CONTACTO_REPOSITORY)
    private readonly contactoRepository: ContactoRepository,
  ) {}

  async findAll(
    tipo?: TipoContacto,
    search?: string,
  ): Promise<ContactoResponseDto[]> {
    const contactos = await this.contactoRepository.findAll({ tipo, search });
    return contactos.map((contacto) =>
      ContactoResponseDto.fromEntity(contacto),
    );
  }

  async findById(id: string): Promise<ContactoResponseDto> {
    const contacto = await this.contactoRepository.findById(id);
    if (!contacto) {
      throw new NotFoundException('Contacto no encontrado');
    }
    return ContactoResponseDto.fromEntity(contacto);
  }

  async create(dto: CreateContactoDto): Promise<ContactoResponseDto> {
    const contacto = await this.contactoRepository.create(dto);
    return ContactoResponseDto.fromEntity(contacto);
  }

  async update(
    id: string,
    dto: UpdateContactoDto,
  ): Promise<ContactoResponseDto> {
    await this.findById(id);
    const contacto = await this.contactoRepository.update(id, dto);
    return ContactoResponseDto.fromEntity(contacto);
  }
}
