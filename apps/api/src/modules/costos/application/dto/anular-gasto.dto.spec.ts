jest.mock('@nestjs/swagger', () => ({
  ApiProperty: () => () => undefined,
  ApiPropertyOptional: () => () => undefined,
}));

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AnularGastoDto } from './anular-gasto.dto';

async function erroresDe(entrada: Record<string, unknown>) {
  const dto = plainToInstance(AnularGastoDto, entrada);
  return validate(dto);
}

describe('AnularGastoDto: el motivo es obligatorio (RF-56)', () => {
  it('acepta un motivo valido', async () => {
    expect(await erroresDe({ motivo: 'Registrado dos veces' })).toHaveLength(0);
  });

  it.each([
    ['sin motivo', {}],
    ['motivo vacio', { motivo: '' }],
    ['solo espacios', { motivo: '        ' }],
    ['demasiado corto', { motivo: 'abc' }],
    ['no es texto', { motivo: 12345678 }],
    ['demasiado largo', { motivo: 'x'.repeat(501) }],
  ])('rechaza: %s', async (_caso, entrada) => {
    const errores = await erroresDe(entrada);
    expect(errores.length).toBeGreaterThan(0);
    expect(errores[0].property).toBe('motivo');
  });

  it('recorta los espacios alrededor del motivo', () => {
    const dto = plainToInstance(AnularGastoDto, { motivo: '  Duplicado  ' });
    expect(dto.motivo).toBe('Duplicado');
  });
});
