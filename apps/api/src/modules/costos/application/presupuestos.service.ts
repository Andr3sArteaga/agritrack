import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CAMPANA_REPOSITORY,
  type CampanaRepository,
} from '../../campanas/domain/repositories/campana.repository';
import {
  PRESUPUESTO_REPOSITORY,
  type PresupuestoRepository,
} from '../domain/repositories/presupuesto.repository';
import { campanaPermiteGastos } from '../domain/rules/campana-permite-gastos';
import { PresupuestoResponseDto } from './dto/presupuesto-response.dto';
import { UpsertPresupuestoDto } from './dto/upsert-presupuesto.dto';

@Injectable()
export class PresupuestosService {
  constructor(
    @Inject(PRESUPUESTO_REPOSITORY)
    private readonly presupuestoRepository: PresupuestoRepository,
    @Inject(CAMPANA_REPOSITORY)
    private readonly campanaRepository: CampanaRepository,
  ) {}

  async obtener(campanaId: string): Promise<PresupuestoResponseDto> {
    await this.obtenerCampana(campanaId);
    const presupuesto = await this.presupuestoRepository.findByCampana(campanaId);
    if (!presupuesto) {
      throw new NotFoundException('La campana todavia no tiene presupuesto');
    }
    return PresupuestoResponseDto.fromEntity(presupuesto);
  }

  async guardar(
    campanaId: string,
    dto: UpsertPresupuestoDto,
  ): Promise<PresupuestoResponseDto> {
    const campana = await this.obtenerCampana(campanaId);
    if (!campanaPermiteGastos(campana)) {
      throw new ConflictException(
        'La campana esta cerrada: no admite cambios en el presupuesto',
      );
    }
    const presupuesto = await this.presupuestoRepository.guardar(
      campanaId,
      dto.montoTotal,
      dto.notas ?? null,
    );
    return PresupuestoResponseDto.fromEntity(presupuesto);
  }

  private async obtenerCampana(id: string) {
    const campana = await this.campanaRepository.findById(id);
    if (!campana) {
      throw new NotFoundException('Campana no encontrada');
    }
    return campana;
  }
}
