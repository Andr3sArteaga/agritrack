import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PARCELA_REPOSITORY,
  type ParcelaRepository,
} from '../domain/repositories/parcela.repository';
import { CreateParcelaDto } from './dto/create-parcela.dto';
import { ParcelaResponseDto } from './dto/parcela-response.dto';
import { UpdateParcelaDto } from './dto/update-parcela.dto';

@Injectable()
export class ParcelasService {
  constructor(
    @Inject(PARCELA_REPOSITORY)
    private readonly parcelaRepository: ParcelaRepository,
  ) {}

  async findAll(): Promise<ParcelaResponseDto[]> {
    const parcelas = await this.parcelaRepository.findAll();
    return parcelas.map((parcela) => ParcelaResponseDto.fromEntity(parcela));
  }

  async findById(id: string): Promise<ParcelaResponseDto> {
    const parcela = await this.parcelaRepository.findById(id);
    if (!parcela) {
      throw new NotFoundException('Parcela no encontrada');
    }
    return ParcelaResponseDto.fromEntity(parcela);
  }

  async create(dto: CreateParcelaDto): Promise<ParcelaResponseDto> {
    const parcela = await this.parcelaRepository.create(dto);
    return ParcelaResponseDto.fromEntity(parcela);
  }

  async update(id: string, dto: UpdateParcelaDto): Promise<ParcelaResponseDto> {
    await this.findById(id);
    const parcela = await this.parcelaRepository.update(id, dto);
    return ParcelaResponseDto.fromEntity(parcela);
  }

  async desactivar(id: string): Promise<ParcelaResponseDto> {
    await this.findById(id);
    const parcela = await this.parcelaRepository.update(id, {
      activa: false,
      disponibleParaPreventa: false,
    });
    return ParcelaResponseDto.fromEntity(parcela);
  }
}
