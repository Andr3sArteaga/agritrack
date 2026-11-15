import { EstadoCampana } from '../../../../generated/prisma/enums';
import { CampanaEntity } from '../../../campanas/domain/entities/campana.entity';
import { campanaPermiteGastos } from './campana-permite-gastos';

function campana(estado: EstadoCampana): CampanaEntity {
  const fecha = new Date('2026-06-01T00:00:00.000Z');
  return new CampanaEntity(
    'camp_1',
    'parc_1',
    'cult_1',
    'Verano 2026',
    fecha,
    null,
    estado,
    fecha,
    fecha,
  );
}

describe('campanaPermiteGastos (RF-57)', () => {
  // Hoy no existe el estado CERRADA (RF-14): la regla permite siempre.
  // Cuando se implemente el cierre, estas pruebas deben actualizarse junto
  // con la funcion (agregar el caso "cerrada" => false).
  it.each(Object.values(EstadoCampana))(
    'permite registrar gastos en una campana %s',
    (estado) => {
      expect(campanaPermiteGastos(campana(estado))).toBe(true);
    },
  );
});
