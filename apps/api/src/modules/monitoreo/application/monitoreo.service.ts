import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PARCELA_REPOSITORY,
  type ParcelaRepository,
} from '../../parcelas/domain/repositories/parcela.repository';
import {
  MONITOREO_REPOSITORY,
  type AnalisisSuelo,
  type MonitoreoRepository,
  type RegistroClima,
} from '../domain/repositories/monitoreo.repository';
import {
  errorAnalisisSuelo,
  errorRegistroClima,
  esFechaFutura,
} from '../domain/rules/validar-monitoreo';
import type {
  CrearAnalisisSueloDto,
  CrearRegistroClimaDto,
} from './dto/monitoreo.dto';

/** Las fechas llegan como "AAAA-MM-DD": se guardan como ese dia a las 00:00 UTC. */
const aDia = (texto: string): Date =>
  new Date(`${texto.slice(0, 10)}T00:00:00.000Z`);

@Injectable()
export class MonitoreoService {
  constructor(
    @Inject(MONITOREO_REPOSITORY)
    private readonly monitoreo: MonitoreoRepository,
    @Inject(PARCELA_REPOSITORY)
    private readonly parcelas: ParcelaRepository,
  ) {}

  async listarSuelo(parcelaId: string): Promise<AnalisisSuelo[]> {
    await this.exigirParcela(parcelaId);
    return this.monitoreo.listarSuelo(parcelaId);
  }

  async crearSuelo(dto: CrearAnalisisSueloDto, usuarioId: string): Promise<AnalisisSuelo> {
    await this.exigirParcela(dto.parcelaId);
    const fecha = this.fechaValida(dto.fecha);
    const valores = {
      ph: dto.ph ?? null,
      nitrogeno: dto.nitrogeno ?? null,
      fosforo: dto.fosforo ?? null,
      potasio: dto.potasio ?? null,
      materiaOrganica: dto.materiaOrganica ?? null,
      humedad: dto.humedad ?? null,
    };
    const error = errorAnalisisSuelo(valores);
    if (error) throw new BadRequestException(error);
    return this.monitoreo.crearSuelo({
      parcelaId: dto.parcelaId,
      fecha,
      ...valores,
      notas: dto.notas?.trim() || null,
      registradoPorId: usuarioId,
    });
  }

  async listarClima(parcelaId: string, desde?: string): Promise<RegistroClima[]> {
    await this.exigirParcela(parcelaId);
    return this.monitoreo.listarClima(parcelaId, desde ? aDia(desde) : undefined);
  }

  async guardarClima(dto: CrearRegistroClimaDto, usuarioId: string): Promise<RegistroClima> {
    await this.exigirParcela(dto.parcelaId);
    const fecha = this.fechaValida(dto.fecha);
    const lluviaMm = dto.lluviaMm ?? null;
    const error = errorRegistroClima(dto.condicion, lluviaMm);
    if (error) throw new BadRequestException(error);
    return this.monitoreo.guardarClima({
      parcelaId: dto.parcelaId,
      fecha,
      condicion: dto.condicion,
      lluviaMm,
      notas: dto.notas?.trim() || null,
      registradoPorId: usuarioId,
    });
  }

  private fechaValida(texto: string): Date {
    const fecha = aDia(texto);
    if (esFechaFutura(fecha, new Date())) {
      throw new BadRequestException('La fecha no puede ser futura.');
    }
    return fecha;
  }

  private async exigirParcela(parcelaId: string): Promise<void> {
    if (!(await this.parcelas.findById(parcelaId))) {
      throw new NotFoundException('Parcela no encontrada');
    }
  }
}
