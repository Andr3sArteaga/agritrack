jest.mock('@nestjs/swagger', () => ({
  ApiPropertyOptional: () => () => undefined,
}));

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReporteCampanaQueryDto } from './reporte-campana-query.dto';

async function erroresDe(entrada: Record<string, unknown>) {
  return validate(plainToInstance(ReporteCampanaQueryDto, entrada));
}

describe('ReporteCampanaQueryDto: fechas del periodo (400 si son invalidas)', () => {
  it('acepta sin fechas y con fechas AAAA-MM-DD validas', async () => {
    expect(await erroresDe({})).toHaveLength(0);
    expect(
      await erroresDe({ desde: '2026-06-01', hasta: '2026-12-01' }),
    ).toHaveLength(0);
  });

  it.each([
    ['formato dd/mm/aaaa', { desde: '01/06/2026' }],
    ['mes inexistente', { hasta: '2026-13-01' }],
    ['dia inexistente', { desde: '2026-02-31' }],
    ['con hora', { hasta: '2026-06-01T10:00:00Z' }],
    ['texto', { desde: 'ayer' }],
  ])('rechaza: %s', async (_caso, entrada) => {
    const errores = await erroresDe(entrada);
    expect(errores).toHaveLength(1);
    expect(['desde', 'hasta']).toContain(errores[0].property);
  });
});
