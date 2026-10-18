// Nest 12 es ESM-only y Jest corre en CJS (Node < 24.9): no se puede cargar
// @nestjs/common real desde aqui. El servicio solo lo usa para decoradores,
// asi que se reemplazan por no-ops; la logica de integridad corre intacta.
jest.mock('@nestjs/common', () => ({
  Injectable: () => () => undefined,
  Inject: () => () => undefined,
}));

import { ActividadEntity } from '../../actividades/domain/entities/actividad.entity';
import type { ActividadRepository } from '../../actividades/domain/repositories/actividad.repository';
import {
  alterarRecalculandoHash,
  alterarSinRecalcular,
  construirCadena,
} from '../../../../test/helpers/cadena-integridad';
import { IntegridadService } from './integridad.service';

function crearServicio(opciones: {
  global?: ActividadEntity[];
  porParcela?: ActividadEntity[];
}): IntegridadService {
  const repositorio: ActividadRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    crearConIntegridad: jest.fn(),
    findTodasOrdenadas: jest.fn().mockResolvedValue(opciones.global ?? []),
    findPorParcela: jest.fn().mockResolvedValue(opciones.porParcela ?? []),
  };
  return new IntegridadService(repositorio);
}

function reemplazar(
  cadena: ActividadEntity[],
  indice: number,
  nueva: ActividadEntity,
): ActividadEntity[] {
  return cadena.map((a, i) => (i === indice ? nueva : a));
}

describe('IntegridadService.verificarGlobal', () => {
  it('valida una cadena intacta', async () => {
    const servicio = crearServicio({ global: construirCadena(5) });

    await expect(servicio.verificarGlobal()).resolves.toEqual({
      valido: true,
      totalVerificadas: 5,
      actividadAlteradaId: null,
      motivo: null,
    });
  });

  it('considera valida una cadena vacia', async () => {
    const servicio = crearServicio({ global: [] });

    await expect(servicio.verificarGlobal()).resolves.toEqual({
      valido: true,
      totalVerificadas: 0,
      actividadAlteradaId: null,
      motivo: null,
    });
  });

  it('detecta una descripcion modificada y senala el registro alterado', async () => {
    const cadena = construirCadena(4);
    const alterada = reemplazar(
      cadena,
      1,
      alterarSinRecalcular(cadena[1], { descripcion: 'Texto manipulado' }),
    );

    const resultado = await crearServicio({ global: alterada }).verificarGlobal();

    expect(resultado.valido).toBe(false);
    expect(resultado.actividadAlteradaId).toBe('act_2');
    expect(resultado.motivo).toBe('hash no coincide con el contenido');
  });

  it('detecta un rendimiento de cosecha modificado', async () => {
    const cadena = construirCadena(3, {
      2: { tipo: 'COSECHA', rendimientoTnHa: 3.1 },
    });
    const alterada = reemplazar(
      cadena,
      2,
      alterarSinRecalcular(cadena[2], { rendimientoTnHa: 9.9 }),
    );

    const resultado = await crearServicio({ global: alterada }).verificarGlobal();

    expect(resultado.valido).toBe(false);
    expect(resultado.actividadAlteradaId).toBe('act_3');
    expect(resultado.motivo).toBe('hash no coincide con el contenido');
  });

  it.each([
    ['fecha', { fecha: new Date('2026-07-01T00:00:00.000Z') }],
    ['cantidad', { cantidad: 600 }],
    ['campanaId', { campanaId: 'camp_otra' }],
    ['hashAnterior', { hashAnterior: 'e'.repeat(64) }],
  ] as const)(
    'detecta la modificacion del campo %s',
    async (_campo, cambios) => {
      const cadena = construirCadena(3);
      const alterada = reemplazar(
        cadena,
        1,
        alterarSinRecalcular(cadena[1], cambios),
      );

      const resultado = await crearServicio({ global: alterada }).verificarGlobal();

      expect(resultado.valido).toBe(false);
      expect(resultado.actividadAlteradaId).toBe('act_2');
    },
  );

  it('informa la primera actividad alterada cuando hay varias', async () => {
    const cadena = construirCadena(5);
    const alterada = reemplazar(
      reemplazar(
        cadena,
        1,
        alterarSinRecalcular(cadena[1], { descripcion: 'x' }),
      ),
      3,
      alterarSinRecalcular(cadena[3], { descripcion: 'y' }),
    );

    const resultado = await crearServicio({ global: alterada }).verificarGlobal();

    expect(resultado.actividadAlteradaId).toBe('act_2');
  });

  it('detecta un registro alterado aunque el atacante recalcule el hash propio (rompe la cadena en el siguiente)', async () => {
    const cadena = construirCadena(4);
    const reHasheada = reemplazar(
      cadena,
      1,
      alterarRecalculandoHash(cadena[1], { descripcion: 'Texto manipulado' }),
    );

    const resultado = await crearServicio({ global: reHasheada }).verificarGlobal();

    expect(resultado.valido).toBe(false);
    expect(resultado.actividadAlteradaId).toBe('act_3');
    expect(resultado.motivo).toBe(
      'hashAnterior no coincide con el registro previo',
    );
  });

  it('detecta un registro eliminado del medio (hueco en la secuencia)', async () => {
    const cadena = construirCadena(4);
    const sinSegunda = cadena.filter((a) => a.secuencia !== 2);

    const resultado = await crearServicio({ global: sinSegunda }).verificarGlobal();

    expect(resultado.valido).toBe(false);
    expect(resultado.actividadAlteradaId).toBe('act_3');
    expect(resultado.motivo).toBe('hueco en la secuencia (registro faltante)');
  });

  it('detecta que se elimino el primer registro de la cadena', async () => {
    const cadena = construirCadena(3);

    const resultado = await crearServicio({ global: cadena.slice(1) }).verificarGlobal();

    expect(resultado.valido).toBe(false);
    expect(resultado.actividadAlteradaId).toBe('act_2');
    expect(resultado.motivo).toBe('hueco en la secuencia (registro faltante)');
  });

  it('detecta registros reordenados', async () => {
    const [a, b, c] = construirCadena(3);

    const resultado = await crearServicio({ global: [a, c, b] }).verificarGlobal();

    expect(resultado.valido).toBe(false);
    expect(resultado.actividadAlteradaId).toBe('act_3');
  });
});

describe('IntegridadService.verificarPorParcela', () => {
  it('valida las actividades intactas de una parcela', async () => {
    const servicio = crearServicio({ porParcela: construirCadena(3) });

    await expect(servicio.verificarPorParcela('parcela_1')).resolves.toEqual({
      valido: true,
      totalVerificadas: 3,
      actividadAlteradaId: null,
      motivo: null,
    });
  });

  it('detecta un registro de la parcela cuyo contenido fue modificado', async () => {
    const cadena = construirCadena(3);
    const alterada = reemplazar(
      cadena,
      2,
      alterarSinRecalcular(cadena[2], { descripcion: 'Texto manipulado' }),
    );

    const resultado = await crearServicio({
      porParcela: alterada,
    }).verificarPorParcela('parcela_1');

    expect(resultado.valido).toBe(false);
    expect(resultado.actividadAlteradaId).toBe('act_3');
    expect(resultado.motivo).toBe('hash no coincide con el contenido');
  });

  it('solo valida cada registro contra su propio hashAnterior guardado (no la continuidad global)', async () => {
    // Una parcela ve un subconjunto de la cadena global: aqui faltan los
    // registros 2 y 4 (de otras parcelas) y aun asi debe validar.
    const cadena = construirCadena(5);
    const deLaParcela = [cadena[0], cadena[2], cadena[4]];

    const resultado = await crearServicio({
      porParcela: deLaParcela,
    }).verificarPorParcela('parcela_1');

    expect(resultado.valido).toBe(true);
    expect(resultado.totalVerificadas).toBe(3);
  });
});
