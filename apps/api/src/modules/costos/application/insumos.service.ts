import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  INSUMO_REPOSITORY,
  type InsumoRepository,
} from '../domain/repositories/insumo.repository';
import { CreateInsumoDto } from './dto/create-insumo.dto';
import { CreatePrecioInsumoDto } from './dto/create-precio-insumo.dto';
import { InsumoResponseDto } from './dto/insumo-response.dto';
import { ListarInsumosQueryDto } from './dto/listar-insumos-query.dto';
import { PrecioInsumoResponseDto } from './dto/precio-insumo-response.dto';
import { UpdateInsumoDto } from './dto/update-insumo.dto';

@Injectable()
export class InsumosService {
  constructor(
    @Inject(INSUMO_REPOSITORY)
    private readonly insumoRepository: InsumoRepository,
  ) {}

  async findAll(filtros: ListarInsumosQueryDto): Promise<InsumoResponseDto[]> {
    const insumos = await this.insumoRepository.findAll(filtros);
    return insumos.map((insumo) => InsumoResponseDto.fromEntity(insumo));
  }

  async findById(id: string): Promise<InsumoResponseDto> {
    return InsumoResponseDto.fromEntity(await this.obtener(id));
  }

  async create(dto: CreateInsumoDto): Promise<InsumoResponseDto> {
    await this.asegurarNombreLibre(dto.nombre);
    const insumo = await this.insumoRepository.create({
      nombre: dto.nombre,
      tipo: dto.tipo,
      unidad: dto.unidad,
      precioInicial: dto.precioInicial,
      vigenteDesde: dto.vigenteDesde ? new Date(dto.vigenteDesde) : new Date(),
    });
    return InsumoResponseDto.fromEntity(insumo);
  }

  async update(id: string, dto: UpdateInsumoDto): Promise<InsumoResponseDto> {
    const actual = await this.obtener(id);
    if (dto.nombre !== undefined && dto.nombre !== actual.nombre) {
      await this.asegurarNombreLibre(dto.nombre);
    }
    const insumo = await this.insumoRepository.update(id, dto);
    return InsumoResponseDto.fromEntity(insumo);
  }

  async listarPrecios(id: string): Promise<PrecioInsumoResponseDto[]> {
    await this.obtener(id);
    const precios = await this.insumoRepository.findPrecios(id);
    return precios.map((precio) => PrecioInsumoResponseDto.fromEntity(precio));
  }

  async agregarPrecio(
    id: string,
    dto: CreatePrecioInsumoDto,
  ): Promise<PrecioInsumoResponseDto> {
    await this.obtener(id);
    const precio = await this.insumoRepository.agregarPrecio(
      id,
      dto.precio,
      dto.vigenteDesde ? new Date(dto.vigenteDesde) : new Date(),
    );
    return PrecioInsumoResponseDto.fromEntity(precio);
  }

  private async obtener(id: string) {
    const insumo = await this.insumoRepository.findById(id);
    if (!insumo) {
      throw new NotFoundException('Insumo no encontrado');
    }
    return insumo;
  }

  private async asegurarNombreLibre(nombre: string): Promise<void> {
    if (await this.insumoRepository.findByNombre(nombre)) {
      throw new ConflictException('Ya existe un insumo con ese nombre');
    }
  }
}
