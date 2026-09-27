import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  CULTIVO_REPOSITORY,
  type CultivoRepository,
} from '../domain/repositories/cultivo.repository';
import { CreateCultivoDto } from './dto/create-cultivo.dto';
import { CultivoResponseDto } from './dto/cultivo-response.dto';

@Injectable()
export class CultivosService {
  constructor(
    @Inject(CULTIVO_REPOSITORY)
    private readonly cultivoRepository: CultivoRepository,
  ) {}

  async findAll(): Promise<CultivoResponseDto[]> {
    const cultivos = await this.cultivoRepository.findAll();
    return cultivos.map((cultivo) => CultivoResponseDto.fromEntity(cultivo));
  }

  async create(dto: CreateCultivoDto): Promise<CultivoResponseDto> {
    const existente = await this.cultivoRepository.findByNombre(dto.nombre);
    if (existente) {
      throw new ConflictException('Ya existe un cultivo con ese nombre');
    }
    const cultivo = await this.cultivoRepository.create(dto);
    return CultivoResponseDto.fromEntity(cultivo);
  }
}
