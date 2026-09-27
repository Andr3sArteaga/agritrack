import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoCampana } from '../../../generated/prisma/enums';
import {
  CULTIVO_REPOSITORY,
  type CultivoRepository,
} from '../../cultivos/domain/repositories/cultivo.repository';
import {
  PARCELA_REPOSITORY,
  type ParcelaRepository,
} from '../../parcelas/domain/repositories/parcela.repository';
import {
  CAMPANA_REPOSITORY,
  type CampanaRepository,
} from '../domain/repositories/campana.repository';
import { CampanaResponseDto } from './dto/campana-response.dto';
import { CreateCampanaDto } from './dto/create-campana.dto';
import { UpdateCampanaDto } from './dto/update-campana.dto';

@Injectable()
export class CampanasService {
  constructor(
    @Inject(CAMPANA_REPOSITORY)
    private readonly campanaRepository: CampanaRepository,
    @Inject(PARCELA_REPOSITORY)
    private readonly parcelaRepository: ParcelaRepository,
    @Inject(CULTIVO_REPOSITORY)
    private readonly cultivoRepository: CultivoRepository,
  ) {}

  async findAll(parcelaId?: string): Promise<CampanaResponseDto[]> {
    const campanas = await this.campanaRepository.findAll(parcelaId);
    return campanas.map((campana) => CampanaResponseDto.fromEntity(campana));
  }

  async findById(id: string): Promise<CampanaResponseDto> {
    const campana = await this.campanaRepository.findById(id);
    if (!campana) {
      throw new NotFoundException('Campana no encontrada');
    }
    return CampanaResponseDto.fromEntity(campana);
  }

  async create(dto: CreateCampanaDto): Promise<CampanaResponseDto> {
    const parcela = await this.parcelaRepository.findById(dto.parcelaId);
    if (!parcela) {
      throw new NotFoundException('Parcela no encontrada');
    }
    const cultivo = await this.cultivoRepository.findById(dto.cultivoId);
    if (!cultivo) {
      throw new NotFoundException('Cultivo no encontrado');
    }

    const estado = dto.estado ?? EstadoCampana.PLANIFICADA;
    if (estado === EstadoCampana.EN_CURSO) {
      await this.asegurarSinEnCursoActiva(dto.parcelaId);
    }

    const campana = await this.campanaRepository.create({
      parcelaId: dto.parcelaId,
      cultivoId: dto.cultivoId,
      temporada: dto.temporada,
      fechaInicio: new Date(dto.fechaInicio),
      fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
      estado,
    });
    return CampanaResponseDto.fromEntity(campana);
  }

  async update(
    id: string,
    dto: UpdateCampanaDto,
  ): Promise<CampanaResponseDto> {
    const actual = await this.campanaRepository.findById(id);
    if (!actual) {
      throw new NotFoundException('Campana no encontrada');
    }

    if (dto.estado === EstadoCampana.EN_CURSO) {
      await this.asegurarSinEnCursoActiva(actual.parcelaId, id);
    }

    const campana = await this.campanaRepository.update(id, {
      temporada: dto.temporada,
      fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : undefined,
      fechaFin:
        dto.fechaFin === undefined ? undefined : new Date(dto.fechaFin),
      estado: dto.estado,
    });
    return CampanaResponseDto.fromEntity(campana);
  }

  async delete(id: string): Promise<void> {
    const campana = await this.campanaRepository.findById(id);
    if (!campana) {
      throw new NotFoundException('Campana no encontrada');
    }
    const totalActividades = await this.campanaRepository.countActividades(
      id,
    );
    if (totalActividades > 0) {
      throw new ConflictException(
        'No se puede eliminar una campana que ya tiene actividades registradas',
      );
    }
    await this.campanaRepository.delete(id);
  }

  private async asegurarSinEnCursoActiva(
    parcelaId: string,
    excludeId?: string,
  ): Promise<void> {
    const enCurso = await this.campanaRepository.findEnCursoByParcela(
      parcelaId,
      excludeId,
    );
    if (enCurso) {
      throw new ConflictException(
        'La parcela ya tiene una campana EN_CURSO. Finalizala antes de iniciar otra.',
      );
    }
  }
}
