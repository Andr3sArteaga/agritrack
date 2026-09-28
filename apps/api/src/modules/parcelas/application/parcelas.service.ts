import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as turf from '@turf/turf';
import type { Feature, Polygon } from 'geojson';
import { PoligonoGeoJson } from '../domain/entities/parcela.entity';
import {
  PARCELA_REPOSITORY,
  type ParcelaRepository,
} from '../domain/repositories/parcela.repository';
import { CreateParcelaDto } from './dto/create-parcela.dto';
import { ParcelaResponseDto } from './dto/parcela-response.dto';
import { PoligonoDto } from './dto/poligono.dto';
import { UpdateParcelaDto } from './dto/update-parcela.dto';

const AREA_SUPERPOSICION_MINIMA_M2 = 1;

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
    let hectareas = dto.hectareas;
    let advertencia: string | undefined;

    if (dto.poligono) {
      const feature = this.construirYValidarPoligono(dto.poligono);
      hectareas = this.calcularHectareas(feature);
      advertencia = await this.detectarSuperposicion(feature);
    }

    const parcela = await this.parcelaRepository.create({
      ...dto,
      hectareas,
      poligono: (dto.poligono as PoligonoGeoJson | undefined) ?? null,
    });

    const respuesta = ParcelaResponseDto.fromEntity(parcela);
    respuesta.advertencia = advertencia;
    return respuesta;
  }

  async update(id: string, dto: UpdateParcelaDto): Promise<ParcelaResponseDto> {
    await this.findById(id);

    let hectareas = dto.hectareas;
    let advertencia: string | undefined;

    if (dto.poligono) {
      const feature = this.construirYValidarPoligono(dto.poligono);
      hectareas = this.calcularHectareas(feature);
      advertencia = await this.detectarSuperposicion(feature, id);
    }

    const parcela = await this.parcelaRepository.update(id, {
      ...dto,
      hectareas,
      poligono: dto.poligono as PoligonoGeoJson | null | undefined,
    });

    const respuesta = ParcelaResponseDto.fromEntity(parcela);
    respuesta.advertencia = advertencia;
    return respuesta;
  }

  async desactivar(id: string): Promise<ParcelaResponseDto> {
    await this.findById(id);
    const parcela = await this.parcelaRepository.update(id, {
      activa: false,
      disponibleParaPreventa: false,
    });
    return ParcelaResponseDto.fromEntity(parcela);
  }

  private construirYValidarPoligono(
    poligono: PoligonoDto,
  ): Feature<Polygon> {
    if (poligono.type !== 'Polygon') {
      throw new BadRequestException('El poligono debe ser de tipo Polygon');
    }
    if (!Array.isArray(poligono.coordinates) || poligono.coordinates.length !== 1) {
      throw new BadRequestException(
        'El poligono debe tener un solo anillo, sin huecos',
      );
    }

    const anillo = poligono.coordinates[0];
    if (!Array.isArray(anillo) || anillo.length < 4) {
      throw new BadRequestException(
        'El poligono debe tener al menos 3 vertices',
      );
    }

    const primero = anillo[0];
    const ultimo = anillo[anillo.length - 1];
    if (primero[0] !== ultimo[0] || primero[1] !== ultimo[1]) {
      throw new BadRequestException(
        'El poligono debe estar cerrado (el primer y el ultimo vertice deben coincidir)',
      );
    }

    let feature: Feature<Polygon>;
    try {
      feature = turf.polygon(poligono.coordinates);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'poligono invalido';
      throw new BadRequestException(`Poligono invalido: ${mensaje}`);
    }

    if (turf.kinks(feature).features.length > 0) {
      throw new BadRequestException('El poligono no puede autointersectarse');
    }

    return feature;
  }

  private calcularHectareas(feature: Feature<Polygon>): number {
    const areaM2 = turf.area(feature);
    return Math.round((areaM2 / 10000) * 100) / 100;
  }

  private async detectarSuperposicion(
    feature: Feature<Polygon>,
    excludeId?: string,
  ): Promise<string | undefined> {
    const parcelas = await this.parcelaRepository.findAll();

    for (const otra of parcelas) {
      if (!otra.activa || !otra.poligono || otra.id === excludeId) continue;

      let otraFeature: Feature<Polygon>;
      try {
        otraFeature = turf.polygon(otra.poligono.coordinates);
      } catch {
        continue;
      }

      const interseccion = turf.intersect(
        turf.featureCollection([feature, otraFeature]),
      );
      if (interseccion && turf.area(interseccion) > AREA_SUPERPOSICION_MINIMA_M2) {
        return `El poligono se superpone con la parcela "${otra.nombre}"`;
      }
    }

    return undefined;
  }
}
