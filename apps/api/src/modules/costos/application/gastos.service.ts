import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoriaGasto } from '../../../generated/prisma/enums';
import type { CampanaEntity } from '../../campanas/domain/entities/campana.entity';
import {
  CAMPANA_REPOSITORY,
  type CampanaRepository,
} from '../../campanas/domain/repositories/campana.repository';
import type { GastoEntity } from '../domain/entities/gasto.entity';
import {
  GASTO_REPOSITORY,
  type GastoRepository,
} from '../domain/repositories/gasto.repository';
import {
  INSUMO_REPOSITORY,
  type InsumoRepository,
} from '../domain/repositories/insumo.repository';
import { campanaPermiteGastos } from '../domain/rules/campana-permite-gastos';
import { AnularGastoDto } from './dto/anular-gasto.dto';
import { CreateGastoDto } from './dto/create-gasto.dto';
import { GastoResponseDto } from './dto/gasto-response.dto';
import { ListarGastosQueryDto } from './dto/listar-gastos-query.dto';
import { UpdateGastoDto } from './dto/update-gasto.dto';

const redondear = (valor: number): number => Math.round(valor * 100) / 100;

@Injectable()
export class GastosService {
  constructor(
    @Inject(GASTO_REPOSITORY)
    private readonly gastoRepository: GastoRepository,
    @Inject(INSUMO_REPOSITORY)
    private readonly insumoRepository: InsumoRepository,
    @Inject(CAMPANA_REPOSITORY)
    private readonly campanaRepository: CampanaRepository,
  ) {}

  async listar(filtros: ListarGastosQueryDto): Promise<GastoResponseDto[]> {
    await this.obtenerCampana(filtros.campanaId);
    const gastos = await this.gastoRepository.findByCampana(
      filtros.campanaId,
      filtros.incluirAnulados ?? false,
    );
    return gastos.map((gasto) => GastoResponseDto.fromEntity(gasto));
  }

  async findById(id: string): Promise<GastoResponseDto> {
    return GastoResponseDto.fromEntity(await this.obtenerGasto(id));
  }

  async crear(
    dto: CreateGastoDto,
    registradoPorId: string,
  ): Promise<GastoResponseDto> {
    const campana = await this.obtenerCampana(dto.campanaId);
    this.asegurarCampanaAbierta(campana);

    const fecha = new Date(dto.fecha);
    const valores = dto.insumoId
      ? await this.valoresDeInsumo(dto, fecha)
      : this.valoresManuales(dto);

    const gasto = await this.gastoRepository.create({
      campanaId: dto.campanaId,
      categoria: dto.categoria,
      descripcion: dto.descripcion,
      fecha,
      estado: dto.estado,
      registradoPorId,
      ...valores,
    });
    return GastoResponseDto.fromEntity(gasto);
  }

  async editar(id: string, dto: UpdateGastoDto): Promise<GastoResponseDto> {
    const gasto = await this.obtenerGasto(id);
    this.asegurarNoAnulado(gasto);
    this.asegurarCampanaAbierta(await this.obtenerCampana(gasto.campanaId));

    if (gasto.insumoId) {
      const cambiaCategoria =
        dto.categoria !== undefined && dto.categoria !== gasto.categoria;
      if (dto.monto !== undefined || cambiaCategoria) {
        throw new BadRequestException(
          'En un gasto de insumo no se edita el monto ni la categoria: anulalo y registra uno nuevo',
        );
      }
    }

    const actualizado = await this.gastoRepository.update(id, {
      categoria: dto.categoria,
      descripcion: dto.descripcion,
      monto: dto.monto,
      fecha: dto.fecha ? new Date(dto.fecha) : undefined,
      estado: dto.estado,
    });
    return GastoResponseDto.fromEntity(actualizado);
  }

  async anular(id: string, dto: AnularGastoDto): Promise<GastoResponseDto> {
    const gasto = await this.obtenerGasto(id);
    this.asegurarNoAnulado(gasto);
    this.asegurarCampanaAbierta(await this.obtenerCampana(gasto.campanaId));

    const anulado = await this.gastoRepository.anular(
      id,
      dto.motivo,
      new Date(),
    );
    return GastoResponseDto.fromEntity(anulado);
  }

  private async valoresDeInsumo(dto: CreateGastoDto, fecha: Date) {
    if (dto.categoria !== CategoriaGasto.INSUMOS) {
      throw new BadRequestException(
        'Un gasto con insumo debe tener categoria INSUMOS',
      );
    }
    const insumo = await this.insumoRepository.findById(dto.insumoId!);
    if (!insumo) {
      throw new NotFoundException('Insumo no encontrado');
    }
    if (!insumo.activo) {
      throw new BadRequestException('El insumo esta desactivado');
    }
    const precio = await this.insumoRepository.findPrecioVigente(
      insumo.id,
      fecha,
    );
    if (!precio) {
      throw new BadRequestException(
        'El insumo no tiene un precio vigente a la fecha del gasto',
      );
    }
    const cantidad = dto.cantidad!;
    return {
      insumoId: insumo.id,
      cantidad,
      precioUnitario: precio.precio,
      monto: redondear(cantidad * precio.precio),
    };
  }

  private valoresManuales(dto: CreateGastoDto) {
    if (dto.cantidad !== undefined) {
      throw new BadRequestException(
        'La cantidad solo aplica a gastos de un insumo del catalogo (insumoId)',
      );
    }
    return {
      insumoId: null,
      cantidad: null,
      precioUnitario: null,
      monto: dto.monto!,
    };
  }

  private async obtenerCampana(id: string): Promise<CampanaEntity> {
    const campana = await this.campanaRepository.findById(id);
    if (!campana) {
      throw new NotFoundException('Campana no encontrada');
    }
    return campana;
  }

  private async obtenerGasto(id: string): Promise<GastoEntity> {
    const gasto = await this.gastoRepository.findById(id);
    if (!gasto) {
      throw new NotFoundException('Gasto no encontrado');
    }
    return gasto;
  }

  private asegurarNoAnulado(gasto: GastoEntity): void {
    if (gasto.anulado) {
      throw new ConflictException('El gasto ya esta anulado');
    }
  }

  private asegurarCampanaAbierta(campana: CampanaEntity): void {
    if (!campanaPermiteGastos(campana)) {
      throw new ConflictException(
        'La campana esta cerrada: no admite cambios en gastos',
      );
    }
  }
}
