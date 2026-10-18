// @nestjs/* v12 es ESM-only y Jest corre en CJS (Node < 24.9): se mockean solo
// los decoradores/excepciones; la logica del servicio corre intacta.
jest.mock('@nestjs/common', () => ({
  Injectable: () => () => undefined,
  Inject: () => () => undefined,
  NotFoundException: class NotFoundException extends Error {},
}));
jest.mock('@nestjs/swagger', () => ({
  ApiProperty: () => () => undefined,
  ApiPropertyOptional: () => () => undefined,
}));

import { EstadoCampana } from '../../../generated/prisma/enums';
import type { CampanaEntity } from '../../campanas/domain/entities/campana.entity';
import type { CampanaRepository } from '../../campanas/domain/repositories/campana.repository';
import type { ActividadEntity } from '../domain/entities/actividad.entity';
import type {
  ActividadRepository,
  CrearActividadData,
} from '../domain/repositories/actividad.repository';
import {
  construirActividad,
  construirCadena,
} from '../../../../test/helpers/cadena-integridad';
import type { CreateActividadDto } from './dto/create-actividad.dto';
import { ActividadesService } from './actividades.service';

const CAMPANA = { id: 'camp_1' } as CampanaEntity;
const RESPONSABLE_ID = 'user_1';

function crearServicio(existentes: ActividadEntity[]) {
  const crearConIntegridad = jest.fn(
    (data: CrearActividadData): Promise<ActividadEntity> => {
      const anterior = existentes[existentes.length - 1];
      return Promise.resolve(
        construirActividad(anterior.secuencia + 1, anterior.hash, data),
      );
    },
  );
  const actividades: ActividadRepository = {
    findAll: jest.fn(),
    findTodasOrdenadas: jest.fn(),
    findPorParcela: jest.fn(),
    findById: jest.fn((id: string) =>
      Promise.resolve(existentes.find((a) => a.id === id) ?? null),
    ),
    crearConIntegridad,
  };
  const actualizarCampana = jest.fn();
  const campanas = {
    findById: jest.fn().mockResolvedValue(CAMPANA),
    update: actualizarCampana,
  } as unknown as CampanaRepository;

  return {
    servicio: new ActividadesService(actividades, campanas),
    actividades,
    actualizarCampana,
  };
}

const dtoCorreccion = (correccionDeId: string): CreateActividadDto => ({
  campanaId: 'camp_1',
  tipo: 'COSECHA',
  fecha: '2026-03-10',
  descripcion: 'Cosecha (corregida)',
  rendimientoTnHa: 3.3,
  correccionDeId,
  motivoCorreccion: 'Bascula mal calibrada',
});

describe('ActividadesService.crear — correcciones', () => {
  it('una correccion llama a crearConIntegridad con correccionDeId y motivo', async () => {
    const original = construirCadena(1, {
      1: { tipo: 'COSECHA', rendimientoTnHa: 3.1 },
    });
    const { servicio, actividades } = crearServicio(original);

    await servicio.crear(dtoCorreccion('act_1'), RESPONSABLE_ID);

    expect(actividades.crearConIntegridad).toHaveBeenCalledTimes(1);
    expect(actividades.crearConIntegridad).toHaveBeenCalledWith(
      expect.objectContaining({
        correccionDeId: 'act_1',
        motivoCorreccion: 'Bascula mal calibrada',
        rendimientoTnHa: 3.3,
        responsableId: RESPONSABLE_ID,
      }),
    );
  });

  it('crea un registro nuevo y no modifica el original', async () => {
    const [original] = construirCadena(1, {
      1: { tipo: 'COSECHA', rendimientoTnHa: 3.1 },
    });
    const copiaAntes = { ...original };
    const { servicio } = crearServicio([original]);

    const nueva = await servicio.crear(dtoCorreccion('act_1'), RESPONSABLE_ID);

    expect(nueva.id).not.toBe(original.id);
    expect(nueva.secuencia).toBeGreaterThan(original.secuencia);
    expect({ ...original }).toEqual(copiaAntes);
    expect(original.rendimientoTnHa).toBe(3.1);
  });

  it('el repositorio de actividades no expone ninguna operacion de update/delete', () => {
    const { actividades } = crearServicio(construirCadena(1));

    expect(Object.keys(actividades).sort()).toEqual([
      'crearConIntegridad',
      'findAll',
      'findById',
      'findPorParcela',
      'findTodasOrdenadas',
    ]);
  });

  it('rechaza corregir una actividad inexistente sin crear nada', async () => {
    const { servicio, actividades } = crearServicio(construirCadena(1));

    await expect(
      servicio.crear(dtoCorreccion('no_existe'), RESPONSABLE_ID),
    ).rejects.toThrow('Actividad a corregir no encontrada');
    expect(actividades.crearConIntegridad).not.toHaveBeenCalled();
  });

  it('corregir una COSECHA no cambia el estado de la campana; una cosecha nueva si', async () => {
    const original = construirCadena(1, {
      1: { tipo: 'COSECHA', rendimientoTnHa: 3.1 },
    });
    const { servicio, actualizarCampana } = crearServicio(original);

    await servicio.crear(dtoCorreccion('act_1'), RESPONSABLE_ID);
    expect(actualizarCampana).not.toHaveBeenCalled();

    await servicio.crear(
      { ...dtoCorreccion('act_1'), correccionDeId: undefined, motivoCorreccion: undefined },
      RESPONSABLE_ID,
    );
    expect(actualizarCampana).toHaveBeenCalledWith('camp_1', {
      estado: EstadoCampana.COSECHADA,
    });
  });
});
