import {
  calcularHashSha256,
  canonicalizarActividad,
  type ContenidoActividad,
} from './canonicalizar-actividad';
import {
  alterarSinRecalcular,
  construirCadena,
  contenidoDe,
  DATOS_BASE,
} from '../../../test/helpers/cadena-integridad';

const CONTENIDO: ContenidoActividad = {
  ...DATOS_BASE,
  secuencia: 1,
  hashAnterior: null,
};

// Valores calculados de forma independiente (crypto directo). Si estos
// tests fallan, cambio el formato canonico y los hashes ya guardados en la
// base dejan de verificar: no "arreglar" el test sin migracion consciente.
const CANONICO_GOLDEN =
  '[1,"camp_1","SIEMBRA","2026-06-05T00:00:00.000Z","Siembra de la temporada actual","Semilla certificada",60,"kg/ha","user_1",false,null,null,null,null,null]';
const HASH_GOLDEN =
  '2c4d94511105ab3e9a7e73479290b209d13497d4385eff302c7112f4e6e5e9ae';

describe('canonicalizarActividad', () => {
  it('produce exactamente el formato canonico esperado (orden fijo de campos)', () => {
    expect(canonicalizarActividad(CONTENIDO)).toBe(CANONICO_GOLDEN);
  });

  it('el mismo registro produce la misma cadena, aunque sean objetos distintos', () => {
    const copia: ContenidoActividad = {
      ...CONTENIDO,
      fecha: new Date(CONTENIDO.fecha.getTime()),
    };
    expect(canonicalizarActividad(copia)).toBe(canonicalizarActividad(CONTENIDO));
  });

  it('no depende del orden de las propiedades del objeto de entrada', () => {
    const desordenado = {
      hashAnterior: null,
      motivoCorreccion: null,
      correccionDeId: null,
      rendimientoTnHa: null,
      maquinariaUtilizada: null,
      tercerizado: false,
      responsableId: 'user_1',
      unidad: 'kg/ha',
      cantidad: 60,
      insumo: 'Semilla certificada',
      descripcion: 'Siembra de la temporada actual',
      fecha: new Date('2026-06-05T00:00:00.000Z'),
      tipo: 'SIEMBRA',
      campanaId: 'camp_1',
      secuencia: 1,
    } satisfies ContenidoActividad;
    expect(canonicalizarActividad(desordenado)).toBe(CANONICO_GOLDEN);
  });

  it('serializa la fecha como ISO UTC (mismo instante = misma cadena)', () => {
    const mismoInstanteOtraZona = new Date('2026-06-04T20:00:00.000-04:00');
    expect(
      canonicalizarActividad({ ...CONTENIDO, fecha: mismoInstanteOtraZona }),
    ).toBe(CANONICO_GOLDEN);
  });

  const cambiosPorCampo: [keyof ContenidoActividad, unknown][] = [
    ['secuencia', 2],
    ['campanaId', 'camp_2'],
    ['tipo', 'COSECHA'],
    ['fecha', new Date('2026-06-06T00:00:00.000Z')],
    ['descripcion', 'Siembra de la temporada actual.'],
    ['insumo', 'Otra semilla'],
    ['cantidad', 61],
    ['unidad', 'kg'],
    ['responsableId', 'user_2'],
    ['tercerizado', true],
    ['maquinariaUtilizada', 'Sembradora'],
    ['rendimientoTnHa', 3.4],
    ['correccionDeId', 'act_0'],
    ['motivoCorreccion', 'error de digitacion'],
    ['hashAnterior', 'abc123'],
  ];

  it.each(cambiosPorCampo)(
    'cambiar el campo %s cambia la cadena canonica',
    (campo, nuevoValor) => {
      const modificado = { ...CONTENIDO, [campo]: nuevoValor };
      expect(canonicalizarActividad(modificado)).not.toBe(CANONICO_GOLDEN);
    },
  );

  it('distingue null de cadena vacia y de cero', () => {
    const conNull = canonicalizarActividad({ ...CONTENIDO, insumo: null });
    const conVacio = canonicalizarActividad({ ...CONTENIDO, insumo: '' });
    const cantidadNull = canonicalizarActividad({ ...CONTENIDO, cantidad: null });
    const cantidadCero = canonicalizarActividad({ ...CONTENIDO, cantidad: 0 });
    expect(conNull).not.toBe(conVacio);
    expect(cantidadNull).not.toBe(cantidadCero);
  });
});

describe('calcularHashSha256', () => {
  it('coincide con el vector de prueba SHA-256 conocido ("abc")', () => {
    expect(calcularHashSha256('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('el hash del registro canonico coincide con el valor calculado de forma independiente', () => {
    expect(calcularHashSha256(canonicalizarActividad(CONTENIDO))).toBe(
      HASH_GOLDEN,
    );
  });

  it('devuelve 64 caracteres hexadecimales y es determinista', () => {
    const hash = calcularHashSha256(CANONICO_GOLDEN);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(calcularHashSha256(CANONICO_GOLDEN)).toBe(hash);
  });

  it('un cambio minimo en la entrada cambia por completo el hash', () => {
    const hashA = calcularHashSha256(CANONICO_GOLDEN);
    const hashB = calcularHashSha256(CANONICO_GOLDEN.replace('60', '61'));
    expect(hashB).not.toBe(hashA);
  });
});

describe('encadenamiento con hashAnterior', () => {
  it('la primera actividad no tiene hashAnterior y las siguientes apuntan al hash previo', () => {
    const cadena = construirCadena(4);

    expect(cadena[0].secuencia).toBe(1);
    expect(cadena[0].hashAnterior).toBeNull();
    for (let i = 1; i < cadena.length; i++) {
      expect(cadena[i].secuencia).toBe(i + 1);
      expect(cadena[i].hashAnterior).toBe(cadena[i - 1].hash);
    }
  });

  it('cada hash se recalcula igual a partir del contenido guardado', () => {
    const cadena = construirCadena(3);
    for (const actividad of cadena) {
      expect(calcularHashSha256(canonicalizarActividad(contenidoDe(actividad)))).toBe(
        actividad.hash,
      );
    }
  });

  it('dos registros con contenido identico pero distinta posicion en la cadena tienen hashes distintos', () => {
    const [primera, segunda] = construirCadena(2);
    expect(segunda.descripcion).toBe(primera.descripcion);
    expect(segunda.hash).not.toBe(primera.hash);
  });

  it('el hashAnterior forma parte del hash: alterarlo invalida el hash propio', () => {
    const [, segunda] = construirCadena(2);
    const manipulada = alterarSinRecalcular(segunda, {
      hashAnterior: 'f'.repeat(64),
    });
    expect(
      calcularHashSha256(canonicalizarActividad(contenidoDe(manipulada))),
    ).not.toBe(manipulada.hash);
  });
});
